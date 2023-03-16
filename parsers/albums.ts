import {
  BADGE_PATH,
  HEADER_DETAIL,
  MENU,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
  SUBTITLE,
  THUMBNAIL_CROPPED,
  TITLE_TEXT,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { parse_like_status, parse_song_runs } from "./songs.ts";
import { get_menu_playlists } from "./util.ts";

export function parse_album_header(response: any) {
  const header = j(response, HEADER_DETAIL);

  const album_info = parse_song_runs(header.subtitle.runs.slice(2));

  const album = {
    ...album_info,
    title: j(header, TITLE_TEXT),
    type: j(header, SUBTITLE),
    thumbnails: j(header, THUMBNAIL_CROPPED),
    isExplicit: j(header, "subtitleBadges", BADGE_PATH) != null,
    ...get_menu_playlists(header),
  } as any;

  if ("description" in header) {
    album.description = header.description.runs[0].text;
  }

  if (header.secondSubtitle.runs.length > 1) {
    album.trackCount = Number(header.secondSubtitle.runs[0].text.split(" ")[0]);
    album.duration = header.secondSubtitle.runs[2].text;
  } else {
    album.duration = header.secondSubtitle.runs[0].text;
  }

  // add to library/uploaded
  const menu = j(header, MENU);
  const toplevel = menu.topLevelButtons;

  album.audioPlaylistId =
    jo(toplevel, "0.buttonRenderer", NAVIGATION_WATCH_PLAYLIST_ID) ??
      jo(toplevel, "0.buttonRenderer", NAVIGATION_PLAYLIST_ID);

  const service = jo(toplevel, "1.toggleButtonRenderer.defaultServiceEndpoint");

  if (service) {
    album.likeStatus = parse_like_status(service);
  }

  return album;
}
