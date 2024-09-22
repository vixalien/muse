import {
  BADGE_LABEL,
  MENU_ITEMS,
  NAVIGATION_VIDEO_TYPE,
  THUMBNAIL,
  TITLE_TEXT,
  TOGGLE_MENU,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { VideoType } from "./playlists.ts";
import {
  LikeStatus,
  MenuTokens,
  parse_song_menu_tokens,
  parse_song_runs,
  SongRuns,
} from "./songs.ts";
import { parse_duration, Thumbnail } from "./util.ts";

export function parse_queue_playlist(results: any) {
  const tracks = [];

  const PPVWR = "playlistPanelVideoWrapperRenderer";
  const PPVR = "playlistPanelVideoRenderer";

  for (const result of results) {
    let counterpart = null, renderer = result;

    if (PPVWR in result) {
      counterpart = result[PPVWR].counterpart[0].counterpartRenderer[PPVR];
      renderer = result[PPVWR].primaryRenderer;
    }

    if (!(PPVR in renderer)) {
      continue;
    }

    const data = renderer[PPVR];

    if ("unplayableText" in data) {
      continue;
    }

    const track = parse_queue_track(data);

    if (counterpart) {
      track.counterpart = parse_queue_track(counterpart);
    }

    tracks.push(track);
  }

  return tracks;
}

/**
 * An object showing information about a track to be represented in a queue
 */
export interface QueueTrack extends SongRuns {
  /**
   * The video ID of the track
   */
  videoId: string;
  /**
   * The name of the track
   */
  title: string;
  /**
   * The duration (in words) of the track, for example "1:34"
   */
  duration: string | null;
  /**
   * The duration in seconds of the track, parsed from `duration`
   */
  duration_seconds: number | null;
  /**
   * The thumbnails of the track
   */
  thumbnails: Thumbnail[];
  /**
   * Feedback tokens to use while adding/removing this track from the library
   */
  feedbackTokens: MenuTokens | null;
  /**
   * Whether or not this track is liked/disliked by the listener
   */
  likeStatus: LikeStatus | null;
  /**
   * The metadata type of this track
   */
  videoType: VideoType | null;
  /**
   * Whether this track is explicit or not
   */
  isExplicit: boolean;
  /**
   * The counterpart of the track.
   *
   * If this track is a video, the counterpart refers to the audio-only version
   * of the song or vice versa.
   */
  counterpart: QueueTrack | null;
}

export function parse_queue_track(data: any) {
  let feedback_tokens = null, like_status = null;

  for (const item of j(data, MENU_ITEMS)) {
    if (TOGGLE_MENU in item) {
      const service = item[TOGGLE_MENU].defaultServiceEndpoint;

      // console.log("idk", service);

      if ("feedbackEndpoint" in service) {
        feedback_tokens = parse_song_menu_tokens(item);
      }

      if ("likeEndpoint" in service) {
        like_status = item[TOGGLE_MENU].defaultIcon.iconType === "FAVORITE"
          ? "INDIFFERENT"
          : "LIKE";
      }
    }
  }

  const song_info = parse_song_runs(data.longBylineText?.runs ?? []);

  const duration = jo(data, "lengthText.runs.0.text");

  return {
    ...song_info,
    videoId: data.videoId,
    title: j(data, TITLE_TEXT),
    duration: duration,
    duration_seconds: duration ? parse_duration(duration) : null,
    thumbnails: j(data, THUMBNAIL),
    feedbackTokens: feedback_tokens,
    likeStatus: like_status,
    videoType: jo(data, "navigationEndpoint", NAVIGATION_VIDEO_TYPE),
    isExplicit: jo(data, BADGE_LABEL) != null,
    counterpart: null,
  } as QueueTrack;
}

export function get_tab_browse_id(
  watchNextRenderer: any,
  tab_id: number,
): string | null {
  if (!("unselectable" in watchNextRenderer.tabs[tab_id].tabRenderer)) {
    return watchNextRenderer.tabs[tab_id].tabRenderer.endpoint.browseEndpoint
      .browseId;
  } else {
    return null;
  }
}
