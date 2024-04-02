import {
  FEEDBACK_TOKEN,
  find_object_by_icon_name,
  MENU_ITEMS,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PAGE_TYPE,
  NAVIGATION_WATCH_PLAYLIST_ID,
  TOGGLE_MENU,
} from "../nav.ts";
import { MENU_LIKE_STATUS } from "../nav.ts";
import { j, jo } from "../util.ts";
import { _ } from "./browsing.ts";
import {
  get_browse_id,
  get_flex_column_item,
  get_item_text,
  parse_duration,
} from "./util.ts";

export interface AudioFormat extends BaseFormat {
  has_audio: true;
  has_video: false;
  audio_quality: "tiny" | "low" | "medium" | "high";
  channels: number;
  sample_rate: number;
  audio_codec: string | null;
  quality:
    | "tiny"
    | "small"
    | "medium"
    | "large";
}

export interface VideoFormat extends BaseFormat {
  has_video: true;
  has_audio: true;
  width: number;
  height: number;
  quality_label:
    | "144p"
    | "144p 15fps"
    | "144p60 HDR"
    | "240p"
    | "240p60 HDR"
    | "270p"
    | "360p"
    | "360p60 HDR"
    | "480p"
    | "480p60 HDR"
    | "720p"
    | "720p60"
    | "720p60 HDR"
    | "1080p"
    | "1080p60"
    | "1080p60 HDR"
    | "1440p"
    | "1440p60"
    | "1440p60 HDR"
    | "2160p"
    | "2160p60"
    | "2160p60 HDR"
    | "4320p"
    | "4320p60";
  fps: number;
  video_codec: string | null;
  video_quality:
    | "tiny"
    | "small"
    | "medium"
    | "large"
    | "hd720"
    | "hd1080"
    | "hd1440"
    | "hd2160"
    | "highres";
}

export type BaseFormat = {
  has_video: boolean;
  has_audio: boolean;
  codecs: string;
  url: string;
  duration_ms: number;
  average_bitrate: number | null;
  bitrate: number;
  content_length: number | null;
  index_range: { end: number; start: number } | null;
  init_range: { end: number; start: number } | null;
  itag: number;
  modified: Date;
  mime_type: string;
  projection_type: "rectangular" | "360" | "stereoscopic" | "3d";
  container: "flv" | "3gp" | "mp4" | "webm" | "ts";
};

export type Format = VideoFormat | AudioFormat;

export type SongArtist = ArtistRun;

export function parse_song_artists(
  data: any,
  index: number,
  slice?: number,
): SongArtist[] | null {
  const flex_item = get_flex_column_item(data, index);
  if (flex_item == null) return null;

  const runs = flex_item.text.runs;
  return parse_song_artists_runs(runs).slice(0, slice);
}

export interface ArtistRun {
  name: string;
  id: string | null;
  type: "artist" | "channel";
}

export function parse_song_artists_runs(runs: any) {
  const artists: ArtistRun[] = [];
  const result = Array(Math.floor(runs.length / 2) + 1).fill(undefined).map((
    _,
    index,
  ) => index);

  for (const i of result) {
    const run = runs[i * 2];

    if (run == null) continue;

    const page_type = jo(run, NAVIGATION_PAGE_TYPE);

    artists.push({
      name: run.text,
      id: jo(run, NAVIGATION_BROWSE_ID),
      type: page_type === "MUSIC_PAGE_TYPE_ARTIST" ? "artist" : "channel",
    });
  }

  return artists;
}

export interface SongRuns {
  artists: SongArtist[];
  album: Album | null;
  views: string | null;
  duration: string | null;
  duration_seconds: number | null;
  year: string | null;
}

export function parse_song_runs(runs: any[], slice_start = 0) {
  const parsed: SongRuns = {
    artists: [],
    album: null,
    views: null,
    duration: null,
    duration_seconds: null,
    year: null,
  };

  const sliced = runs.slice(slice_start);

  for (const i in sliced) {
    const run = sliced[i];

    // uneven items are always separators
    if (Number(i) % 2) {
      continue;
    }

    const text = run.text;

    if ("navigationEndpoint" in run) {
      // artist or album
      const item = { name: text, id: jo(run, NAVIGATION_BROWSE_ID) };

      if (
        item.id &&
        (item.id.startsWith("MPRE") || item.id.includes("release_detail"))
      ) {
        // album
        parsed.album = item;
      } else {
        // artist
        parsed.artists.push({
          ...item,
          type: jo(run, NAVIGATION_PAGE_TYPE) === "MUSIC_PAGE_TYPE_ARTIST"
            ? "artist"
            : "channel",
        });
      }
    } else {
      // note: YT uses non-breaking space \xa0 to separate number and magnitude
      if (text.match(/\d([^ ])* [^ ]*$/) && Number(i) > 0) {
        parsed.views = text;
      } else if (text.match(/^(\d+:)*\d+:\d+$/)) {
        parsed.duration = text;
        parsed.duration_seconds = parse_duration(text);
      } else if (text.match(/^\d{4}$/)) {
        parsed.year = text;
      } else if (text != _("video")) {
        // artist without id
        parsed.artists.push({
          name: text,
          id: null,
          type: "artist",
        });
      }
    }
  }

  return parsed;
}

export interface Album {
  name: string;
  id: string | null;
}

export function parse_song_album(data: any, index: number): Album | null {
  const flex_item = get_flex_column_item(data, index);
  if (flex_item == null) return null;

  return {
    name: get_item_text(data, index),
    id: get_browse_id(flex_item, 0),
  };
}

export interface MenuTokens {
  add: string | null;
  remove: string | null;
  saved: boolean;
}

export function parse_song_menu_tokens(item: any): MenuTokens {
  const toggle_menu = item[TOGGLE_MENU],
    service_type = toggle_menu.defaultIcon.iconType;
  let library_add_token = jo(
      toggle_menu,
      `defaultServiceEndpoint.${FEEDBACK_TOKEN}`,
    ),
    library_remove_token = jo(
      toggle_menu,
      `toggledServiceEndpoint.${FEEDBACK_TOKEN}`,
    );

  // swap if already in library
  if (service_type == "LIBRARY_SAVED") {
    [library_add_token, library_remove_token] = [
      library_remove_token,
      library_add_token,
    ];
  }

  return {
    add: library_add_token,
    remove: library_remove_token,
    saved: service_type == "LIBRARY_SAVED",
  };
}

export function get_menu_tokens(item: any) {
  const toggle_menu = find_object_by_icon_name(
    j(item, MENU_ITEMS),
    TOGGLE_MENU,
    [
      "LIBRARY_ADD",
      "LIBRARY_SAVED",
    ],
  );

  return toggle_menu ? parse_song_menu_tokens(toggle_menu) : null;
}

export function get_menu_like_status(item: any): LikeStatus | null {
  if (
    find_object_by_icon_name(
      j(item, MENU_ITEMS),
      TOGGLE_MENU,
      "FAVORITE",
    )
  ) {
    return "INDIFFERENT";
  }

  if (
    find_object_by_icon_name(
      j(item, MENU_ITEMS),
      TOGGLE_MENU,
      "UNFAVORITE",
    )
  ) {
    return "LIKE";
  }

  return null;
}

export function get_buttons_like_status(item: any): LikeStatus | null {
  return jo(item, MENU_LIKE_STATUS);
}

export interface ShuffleAndRadioIds {
  shuffleId: string | null;
  radioId: string | null;
}

export function get_shuffle_and_radio_ids(item: any): ShuffleAndRadioIds {
  const shuffle = find_object_by_icon_name(
    jo(item, MENU_ITEMS),
    "menuNavigationItemRenderer",
    "MUSIC_SHUFFLE",
  );

  const radio = find_object_by_icon_name(
    jo(item, MENU_ITEMS),
    "menuNavigationItemRenderer",
    "MIX",
  );

  return {
    shuffleId: shuffle
      ? jo(shuffle, "menuNavigationItemRenderer", NAVIGATION_WATCH_PLAYLIST_ID)
      : null,
    radioId: radio
      ? jo(radio, "menuNavigationItemRenderer", NAVIGATION_WATCH_PLAYLIST_ID)
      : null,
  };
}

export function parse_menu_library_like_status(item: any): LikeStatus | null {
  const toggle_menu = item[TOGGLE_MENU],
    service_type = toggle_menu.defaultIcon.iconType;

  if (typeof service_type !== "string") return null;

  return service_type == "LIBRARY_SAVED" ? "LIKE" : "INDIFFERENT";
}

export function get_library_like_status(item: any) {
  const toggle_menu = find_object_by_icon_name(
    jo(item, MENU_ITEMS),
    TOGGLE_MENU,
    [
      "LIBRARY_ADD",
      "LIBRARY_SAVED",
    ],
  );

  return toggle_menu ? parse_menu_library_like_status(toggle_menu) : null;
}

export function parse_format(format: any) {
  const has_video = format.width && format.height;
  const has_audio = format.audioSampleRate;

  const parse_ranges = (ranges: any) => {
    if (!ranges) return ranges;
    return {
      start: Number(ranges.start),
      end: Number(ranges.end),
    };
  };

  const codecs = format.mimeType
    ? format.mimeType.match(/codecs="(.*)"/)[1]
    : null;

  const n: BaseFormat = {
    codecs,
    itag: format.itag as number,
    url: format.url as string,
    bitrate: format.bitrate,
    modified: new Date(Number(format.lastModified) / 1000),
    content_length: Number(format.contentLength) ?? null,
    average_bitrate: Number(format.averageBitrate) ?? null,
    init_range: parse_ranges(format.initRange),
    index_range: parse_ranges(format.indexRange),
    duration_ms: Number(format.approxDurationMs) ?? null,
    projection_type: format.projectionType.toLowerCase() ?? null,
    mime_type: format.mimeType,
    has_audio: false,
    has_video: false,
    container: format.mimeType.split(";")[0].split("/")[1],
  };

  if (has_video) {
    Object.assign(n, {
      has_video: true,
      width: format.width,
      height: format.height,
      fps: format.fps,
      quality_label: format.qualityLabel,
      video_codec: codecs ? codecs.split(", ")[0] : null,
      video_quality: format.quality,
    } as VideoFormat);
  }
  if (has_audio) {
    Object.assign(n, {
      has_audio: true,
      sample_rate: format.audioSampleRate,
      audio_quality: format.audioQuality?.slice(14).toLowerCase(),
      quality: format.quality,
      channels: format.audioChannels,
      audio_codec: codecs ? codecs.split(", ").slice(-1)[0] : null,
    } as AudioFormat);
  }

  return n;
}

export type LikeStatus = "LIKE" | "INDIFFERENT" | "DISLIKE";

export function parse_like_status(service: any) {
  const status = ["LIKE", "INDIFFERENT"];
  return status[(status.indexOf(service) + 1) % status.length] as LikeStatus;
}
