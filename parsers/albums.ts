import { ArtistRun } from "../mod.ts";
import { DESCRIPTION_SHELF, SINGLE_BADGE_LABEL } from "../nav.ts";
import { DESCRIPTION } from "../nav.ts";
import { THUMBNAILS } from "../nav.ts";
import { find_object_by_key } from "../nav.ts";
import { PLAY_PLAYLIST_ID, SUBTITLE, TITLE_TEXT } from "../nav.ts";
import { j, jo } from "../util.ts";
import { AlbumType } from "./browsing.ts";
import { get_library_like_status, parse_song_artists_runs } from "./songs.ts";
import { LikeStatus } from "./songs.ts";
import { get_menu_playlists, MenuPlaylists, Thumbnail } from "./util.ts";

export interface AlbumHeader extends MenuPlaylists {
  title: string;
  album_type: AlbumType;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  description: string | null;
  trackCount: string | null;
  duration: string | null;
  audioPlaylistId: string | null;
  likeStatus: LikeStatus | null;
  artists: ArtistRun[];
  year: string | null;
}

export function parse_album_header(header: any) {
  const playButton =
    find_object_by_key(header.buttons, "musicPlayButtonRenderer")!
      .musicPlayButtonRenderer;

  const album: AlbumHeader = {
    // the last header button
    ...get_menu_playlists({ menu: header.buttons.slice(-1)[0] }),
    title: j(header, TITLE_TEXT),
    album_type: j(header, SUBTITLE),
    thumbnails: j(header, THUMBNAILS),
    isExplicit: jo(header, SINGLE_BADGE_LABEL) != null,
    trackCount: null,
    duration: null,
    audioPlaylistId: jo(playButton, PLAY_PLAYLIST_ID),
    description: j(header, "description", DESCRIPTION_SHELF, DESCRIPTION),
    likeStatus: get_library_like_status({
      menu: find_object_by_key(header.buttons, "menuRenderer"),
    }),
    artists: parse_song_artists_runs(header.straplineTextOne.runs),
    year: j(
      header,
      "subtitle.runs",
      (header.subtitle.runs.length - 1).toString(),
      "text",
    ),
  };

  if (header.secondSubtitle.runs.length > 1) {
    album.trackCount = header.secondSubtitle.runs[0].text;
    album.duration = header.secondSubtitle.runs[2].text;
  } else {
    album.duration = header.secondSubtitle.runs[0].text;
  }

  return album;
}
