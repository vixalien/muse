import { FEEDBACK_TOKEN, NAVIGATION_BROWSE_ID, TOGGLE_MENU } from "../nav.ts";
import { jo } from "../util.ts";
import type { AudioFormat, Format, VideoFormat } from "./types.d.ts";
import {
  get_browse_id,
  get_flex_column_item,
  get_item_text,
  parse_duration,
} from "./util.ts";

export function parse_song_artists(data: any, index: number, slice?: number) {
  const flex_item = get_flex_column_item(data, index);
  if (flex_item == null) return null;

  const runs = flex_item.text.runs;
  return parse_song_artists_runs(runs).slice(0, slice);
}

export function parse_song_artists_runs(runs: any) {
  const artists = [];
  const result = Array(Math.floor(runs.length / 2) + 1).fill(undefined).map((
    _,
    index,
  ) => index);

  for (const i of result) {
    const run = runs[i * 2];

    if (run == null) continue;

    artists.push({
      name: run.text,
      id: jo(run, NAVIGATION_BROWSE_ID),
    });
  }

  return artists;
}

export function parse_song_runs(runs: any[]) {
  const parsed: any = { artists: [] };

  for (const i in runs) {
    const run = runs[i];

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
        parsed.artists.push(item);
      }
    } else {
      // note: YT uses non-breaking space \xa0 to separate number and magnitude
      if (text.match(/\d([^ ])* [^ ]*$/) && Number(i) > 0) {
        parsed.views = text.split(" ")[0];
      } else if (text.match(/^(\d+:)*\d+:\d+$/)) {
        parsed.duration = text;
        parsed.duration_seconds = parse_duration(text);
      } else if (text.match(/^\d{4}$/)) {
        parsed.year = text;
      } else if (text.toLowerCase() != "song") {
        // artist without id
        parsed.artists.push({
          name: text,
          id: null,
        });
      }
    }
  }

  return parsed;
}

export function parse_song_album(data: any, index: number) {
  const flex_item = get_flex_column_item(data, index);
  if (flex_item == null) return null;

  return {
    name: get_item_text(data, index),
    id: get_browse_id(flex_item, 0),
  };
}

export function parse_song_menu_tokens(item: any) {
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
  if (service_type == "LIBRARY_REMOVE") {
    [library_add_token, library_remove_token] = [
      library_remove_token,
      library_add_token,
    ];
  }

  return {
    add: library_add_token,
    remove: library_remove_token,
  };
}

export function parse_format(format: any) {
  const has_video = format.width && format.height;
  const has_audio = format.bitrate;

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

  const n: Format = {
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
    quality: format.quality,
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
    } as VideoFormat);
  }
  if (has_audio) {
    Object.assign(n, {
      has_audio: true,
      sample_rate: format.audioSampleRate,
      audio_quality: format.audioQuality?.slice(14).toLowerCase(),
      channels: format.audioChannels,
      audio_codec: codecs ? codecs.split(", ").slice(-1)[0] : null,
    } as AudioFormat);
  }

  return n;
}

export function parse_like_status(service: any) {
  const status = ["LIKE", "INDIFFERENT"];
  return status[(status.indexOf(service) + 1) % status.length];
}
