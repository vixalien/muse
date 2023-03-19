import {
  BADGE_LABEL,
  MENU_ITEMS,
  MENU_LIKE_STATUS,
  MENU_SERVICE,
  MRLIR,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  THUMBNAILS,
  TOGGLE_MENU,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import {
  Album,
  Artist,
  MenuTokens,
  parse_song_album,
  parse_song_artists,
  parse_song_menu_tokens,
} from "./songs.ts";
import {
  get_fixed_column_item,
  get_item_text,
  parse_duration,
  Thumbnail,
} from "./util.ts";

export interface PlaylistItem {
  videoId: string;
  title: string;
  artists: Artist[];
  album: Album | null;
  likeStatus: "LIKE" | "INDIFFERENT" | "DISLIKE";
  thumbnails: Thumbnail[];
  isAvailable: boolean;
  isExplicit: boolean;
  videoType:
    | // Official Music Videos
    "MUSIC_VIDEO_TYPE_OMV"
    | // User Generated Content
    "MUSIC_VIDEO_TYPE_UGC"
    | // Artist Videos
    "MUSIC_VIDEO_TYPE_ATV";
  duration: string | null;
  duration_seconds: number | null;
  setVideoId: string | null;
  feedbackTokens: MenuTokens | null;
}

export const parse_playlist_items = (
  results: any,
  // menu_entries?: any[][] | null,
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

    // TODO: fix this
    // if (menu_entries) {
    //   for (const menu_entry of menu_entries) {
    //     const lastId = menu_entry[menu_entry.length - 1];
    //     song[lastId] = j(data, `${MENU_ITEMS}.${menu_entry.join(".")}`);
    //   }
    // }

    songs.push(song);
  }

  return songs;
};

export function validate_playlist_id(playlistId: string) {
  return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
}
