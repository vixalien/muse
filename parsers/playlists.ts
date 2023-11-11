import {
  BADGE_LABEL,
  MENU_ITEMS,
  MENU_LIKE_STATUS,
  MENU_SERVICE,
  MRLIR,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  TEXT_RUN_TEXT,
  THUMBNAILS,
  TOGGLE_MENU,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { TrendChange } from "./browsing.ts";
import {
  Album,
  LikeStatus,
  MenuTokens,
  parse_song_album,
  parse_song_artists,
  parse_song_menu_tokens,
  SongArtist,
} from "./songs.ts";
import {
  get_fixed_column_item,
  get_item_text,
  parse_duration,
  Thumbnail,
} from "./util.ts";

export type VideoType =
  | "MUSIC_VIDEO_TYPE_OMV" /** Official Music Videos */
  | "MUSIC_VIDEO_TYPE_UGC" /** User Generated Content */
  | "MUSIC_VIDEO_TYPE_ATV" /** Artist Videos */
  | "MUSIC_VIDEO_TYPE_PRIVATELY_OWNED_TRACK" /** Song uploaded by user */;

export interface PlaylistItem {
  videoId: string;
  title: string;
  artists: SongArtist[];
  album: Album | null;
  likeStatus: LikeStatus;
  thumbnails: Thumbnail[];
  isAvailable: boolean;
  isExplicit: boolean;
  videoType: VideoType;
  duration: string | null;
  duration_seconds: number | null;
  setVideoId: string | null;
  feedbackTokens: MenuTokens | null;
  feedbackToken: null;
  rank: string | null;
  change: TrendChange | null;
}

export const parse_playlist_items = (
  results: any,
  menu_entries?: string[][] | null,
) => {
  const songs = [];

  for (const result of results) {
    if (!(MRLIR in result)) {
      continue;
    }

    const data = result[MRLIR];

    let videoId = null, setVideoId = null, like = null, feedback_tokens = null;

    // if the item has a menu, find its setVideoId
    if ("menu" in data) {
      for (const item of j(data, MENU_ITEMS)) {
        if ("menuServiceItemRenderer" in item) {
          const menu_service = j(item, MENU_SERVICE);
          if ("playlistEditEndpoint" in menu_service) {
            setVideoId = j(
              menu_service,
              "playlistEditEndpoint.actions.0.setVideoId",
            );
            videoId = jo(
              menu_service,
              "playlistEditEndpoint.actions.0.removeVideoId",
            );
          }
        }

        if (TOGGLE_MENU in item) {
          feedback_tokens = parse_song_menu_tokens(item);
        }
      }
    }

    const play = jo(data, PLAY_BUTTON);
    if (play != null) {
      if ("playNavigationEndpoint" in play) {
        videoId = j(play, "playNavigationEndpoint.watchEndpoint.videoId");

        if ("menu" in data) {
          like = jo(data, MENU_LIKE_STATUS);
        }
      }
    }

    const title = get_item_text(data, 0);

    if (title == "Song deleted") {
      continue;
    }

    const artists = parse_song_artists(data, 1) ?? [];

    const album = parse_song_album(data, 2);

    let duration = null;

    if ("fixedColumns" in data) {
      const column = get_fixed_column_item(data, 0);
      if ("simpleText" in column) {
        duration = j(column, "text.simpleText");
      } else {
        duration = j(column, "text.runs[0].text");
      }
    }

    let thumbnails = null;
    if ("thumbnail" in data) {
      thumbnails = j(data, THUMBNAILS);
    }

    let isAvailable = true;
    if ("musicItemRendererDisplayPolicy" in data) {
      isAvailable = data.musicItemRendererDisplayPolicy !=
        "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT";
    }

    const isExplicit = jo(data, BADGE_LABEL) != null;

    const videoType = jo(
      data,
      `${MENU_ITEMS}[0].menuNavigationItemRenderer.navigationEndpoint.${NAVIGATION_VIDEO_TYPE}`,
    );

    const rank = jo(data, "customIndexColumn.musicCustomIndexColumnRenderer");

    const song: PlaylistItem = {
      videoId,
      title,
      artists,
      album,
      likeStatus: like,
      thumbnails,
      isAvailable,
      isExplicit,
      videoType,
      duration: null,
      duration_seconds: null,
      setVideoId: null,
      feedbackTokens: null,
      feedbackToken: null,
      rank: rank ? j(rank, TEXT_RUN_TEXT) : null,
      change: rank ? jo(rank, "icon.iconType")?.split("_")[2] ?? null : null,
    };

    if (duration) {
      song.duration = duration;
      song.duration_seconds = parse_duration(duration);
    }

    if (setVideoId) {
      song.setVideoId = setVideoId;
    }

    if (feedback_tokens) {
      song.feedbackTokens = feedback_tokens;
    }

    if (menu_entries) {
      for (const menu_entry of menu_entries) {
        song.feedbackToken = j(data, `${MENU_ITEMS}.${menu_entry.join(".")}`);
      }
    }

    songs.push(song);
  }

  return songs;
};

export function validate_playlist_id(playlistId: string) {
  return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
}
