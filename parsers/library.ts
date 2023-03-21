import {
  find_object_by_key,
  ITEM_SECTION,
  MENU_PLAYLIST_ID,
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
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { parse_playlist_items } from "./playlists.ts";
import { parse_song_runs } from "./songs.ts";

export function parse_albums(results: any) {
  const albums = [];
  for (const result of results) {
    const data = result[MTRIR];
    let album = {
      browseId: j(data, TITLE, NAVIGATION_BROWSE_ID),
      playlistId: jo(data, MENU_PLAYLIST_ID),
      title: j(data, TITLE_TEXT),
      thumbnails: j(data, THUMBNAIL_RENDERER),
    } as any;

    if ("runs" in data.subtitle) {
      album.type = j(data, SUBTITLE);
      album = { ...parse_song_runs(data.subtitle.runs.slice(2)) };
    }

    albums.push(album);
  }

  return albums;
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
