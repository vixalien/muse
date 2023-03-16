import {
  MENU_PLAYLIST_ID,
  MTRIR,
  NAVIGATION_BROWSE_ID,
  SUBTITLE,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { j, jo } from "../util.ts";
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
