import { get_continuations } from "../continuations.ts";
import {
  check_auth,
  PaginationAndOrderOptions,
  prepare_order_params,
} from "../mixins/utils.ts";
import { request_json } from "../mixins/_request.ts";
import {
  FEEDBACK_TOKEN,
  find_object_by_key,
  GRID,
  ITEM_SECTION,
  MENU_PLAYLIST_ID,
  MENU_SERVICE,
  MRLIR,
  MTRIR,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN,
  SINGLE_COLUMN_TAB,
  SUBTITLE,
  TAB_1_CONTENT,
  THUMBNAIL_RENDERER,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { AlbumType } from "./browsing.ts";
import { parse_playlist_items, PlaylistItem } from "./playlists.ts";
import { parse_song_runs, SongRuns } from "./songs.ts";
import {
  get_item_text,
  get_menu_playlists,
  MenuPlaylists,
  Thumbnail,
} from "./util.ts";

export interface ParsedLibraryArtist extends MenuPlaylists {
  browseId: string;
  name: string;
  songs: string | null;
  subscribers: string | null;
  thumbnails: Thumbnail[];
}

export function parse_artists(results: any, has_subscribers = false) {
  const artists: ParsedLibraryArtist[] = [];
  for (const result of results) {
    const data = result[MRLIR];

    const subtitle = get_item_text(data, 1).split(" ")[0];

    const artist: ParsedLibraryArtist = {
      ...get_menu_playlists(data),
      browseId: j(data, NAVIGATION_BROWSE_ID),
      name: get_item_text(data, 0),
      songs: !has_subscribers ? subtitle : null,
      subscribers: has_subscribers ? subtitle : null,
      thumbnails: jo(data, THUMBNAILS),
    };

    artists.push(artist);
  }

  return artists;
}

export interface ParsedLibraryAlbum extends SongRuns {
  browseId: string;
  playlistId: string | null;
  title: string;
  thumbnails: Thumbnail[];
  album_type: AlbumType | null;
}

export function parse_albums(results: any) {
  const albums: ParsedLibraryAlbum[] = [];

  for (const result of results) {
    const data = result[MTRIR];

    const album: ParsedLibraryAlbum = {
      ...parse_song_runs(data.subtitle.runs.slice(2) ?? [{}]),
      browseId: j(data, TITLE, NAVIGATION_BROWSE_ID),
      playlistId: jo(data, MENU_PLAYLIST_ID),
      title: j(data, TITLE_TEXT),
      thumbnails: j(data, THUMBNAIL_RENDERER),
      album_type: null,
    };

    if ("runs" in data.subtitle) {
      album.album_type = j(data, SUBTITLE);
    }

    albums.push(album);
  }

  return albums;
}

export async function fetch_library_contents<T extends any>(
  browseId: string,
  options: PaginationAndOrderOptions = {},
  parse: (results: any) => T[],
  grid: boolean,
) {
  const { order, limit = 25, continuation = null } = options;

  await check_auth();

  const data: Record<string, any> = { browseId };
  const endpoint = "browse";

  if (order != null) {
    data.params = prepare_order_params(order);
  }

  const library_contents: { items: T[]; continuation: string | null } = {
    items: [],
    continuation: continuation,
  };

  if (!library_contents.continuation) {
    const json = await request_json(endpoint, { data });

    const results = get_library_contents(json, grid ? GRID : MUSIC_SHELF);

    if (results != null) {
      // console.log("results", parse(results.items ?? results.contents));
      library_contents.items = parse(results.items ?? results.contents);

      if ("continuations" in results) {
        library_contents.continuation = results;
      }
    }
  }

  if (library_contents.continuation) {
    const continued_data = await get_continuations(
      library_contents.continuation,
      grid ? "gridContinuation" : "musicShelfContinuation",
      limit - library_contents.items.length,
      (params) => {
        return request_json(endpoint, { data, params });
      },
      (contents) => {
        return parse(contents.items ?? contents.contents);
      },
    );

    library_contents.items.push(...continued_data.items);
    library_contents.continuation = continued_data.continuation;
  }

  return library_contents;
}

export function parse_library_songs(response: any) {
  const results = get_library_contents(response, MUSIC_SHELF);

  return {
    results: results,
    parsed: results ? parse_playlist_items(results.contents.slice(1)) : null,
  };
}

/**
 * Find library contents. This function is a bit messy now
 * as it is supporting two different response types. Can be
 * cleaned up once all users are migrated to the new responses.
 */
export function get_library_contents(response: string, renderer: string) {
  const section = jo(response, SINGLE_COLUMN_TAB, SECTION_LIST);

  let contents: any = null;

  if (section == null) {
    // empty library
    contents = jo(
      response,
      SINGLE_COLUMN,
      TAB_1_CONTENT,
      SECTION_LIST_ITEM,
      renderer,
    );
  } else {
    const results = find_object_by_key(section, "itemSectionRenderer");

    if (results == null) {
      contents = jo(response, SINGLE_COLUMN_TAB, SECTION_LIST_ITEM, renderer);
    } else {
      contents = jo(results, ITEM_SECTION, renderer);
    }
  }

  return contents;
}

export interface History {
  categories: { title: string; items: PlaylistItem[] }[];
}

export async function get_history() {
  await check_auth();

  const json = await request_json("browse", {
    data: {
      browseId: "FEmusic_history",
    },
  });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  const history: History = {
    categories: [],
  };

  for (const content of results) {
    const data = jo(content, MUSIC_SHELF, "contents");

    if (!data) {
      // I'm not sure what this means...
      throw new Error(jo(content, "musicNotifierShelfRenderer", TITLE));
    }

    const songlist = parse_playlist_items(data, [[
      "-1:",
      MENU_SERVICE,
      FEEDBACK_TOKEN,
    ]]);

    const category: { title: string; items: PlaylistItem[] } = {
      title: j(content, MUSIC_SHELF, TITLE_TEXT),
      items: songlist,
    };

    history.categories.push(category);
  }

  return history;
}

export function parse_toast(json: any): string | null {
  const action = jo(
    json,
    "actions.0.addToToastAction.item.notificationActionRenderer.responseText",
  ) ??
    jo(
      json,
      "actions.0.addToToastAction.item.notificationTextRenderer.successResponseText",
    );

  if (action) {
    return action.runs.map((run: any) => run.text).join("");
  } else {
    return null;
  }
}
