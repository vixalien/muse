import { get_continuations } from "../continuations.ts";
import {
  check_auth,
  PaginationAndOrderOptions,
  prepare_order_params,
} from "../mixins/utils.ts";
import { request_json } from "../mixins/_request.ts";
import {
  find_object_by_key,
  GRID,
  ITEM_SECTION,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN,
  SINGLE_COLUMN_TAB,
  TAB_1_CONTENT,
  THUMBNAILS,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { parse_playlist_items } from "./playlists.ts";
import {
  get_item_text,
  get_menu_playlists,
  MenuPlaylists,
  Thumbnail,
} from "./util.ts";

export interface ParsedLibraryArtist extends MenuPlaylists {
  type: "library-artist";
  browseId: string;
  name: string;
  songs: string | null;
  subscribers: string | null;
  thumbnails: Thumbnail[];
}

export function parse_library_artist(
  data: any,
  has_subscribers = false,
): ParsedLibraryArtist {
  const subtitle = get_item_text(data, 1);

  return {
    type: "library-artist",
    ...get_menu_playlists(data),
    browseId: j(data, NAVIGATION_BROWSE_ID),
    name: get_item_text(data, 0),
    songs: !has_subscribers ? subtitle : null,
    subscribers: has_subscribers ? subtitle : null,
    thumbnails: jo(data, THUMBNAILS),
  };
}

export async function fetch_library_contents<T extends any>(
  browseId: string,
  options: PaginationAndOrderOptions = {},
  parse: (results: any) => T[],
  grid: boolean,
) {
  const { order, limit = 20, continuation = null, signal } = options;

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
    const json = await request_json(endpoint, { data, signal });

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
        return request_json(endpoint, { data, params, signal });
      },
      (contents) => {
        return parse(contents);
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
