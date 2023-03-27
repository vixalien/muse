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
import { AlbumType } from "./browsing.ts";
import {
  LikeStatus,
  parse_like_status,
  parse_song_runs,
  SongRuns,
} from "./songs.ts";
import { get_menu_playlists, MenuPlaylists, Thumbnail } from "./util.ts";

export type AlbumHeaderExtends = SongRuns & MenuPlaylists;

export interface AlbumHeader extends AlbumHeaderExtends {
  title: string;
  album_type: AlbumType;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  description: string | null;
  trackCount: number | null;
  duration: string | null;
  audioPlaylistId: string | null;
  likeStatus: LikeStatus | null;
}

export function parse_album_header(response: any) {
  const header = j(response, HEADER_DETAIL);

  const album_info = parse_song_runs(header.subtitle.runs.slice(2));

  const album: AlbumHeader = {
    ...album_info,
    ...get_menu_playlists(header),
    title: j(header, TITLE_TEXT),
    album_type: j(header, SUBTITLE).toLowerCase(),
    thumbnails: j(header, THUMBNAIL_CROPPED),
    isExplicit: jo(header, "subtitleBadges", BADGE_PATH) != null,
    description: null,
    trackCount: null,
    duration: null,
    audioPlaylistId: null,
    likeStatus: null,
  };

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
