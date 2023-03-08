export type AudioFormat = {
  has_audio: true;
  audio_quality: "tiny" | "low" | "medium" | "high";
  channels: number;
  sample_rate: number;
  audio_codec: string | null;
};

export type VideoFormat = {
  has_video: true;
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
};

export type BaseFormat = {
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
  projection_type: "rectangular" | string;
  quality:
    | "tiny"
    | "small"
    | "medium"
    | "large"
    | "hd720"
    | "hd1080"
    | "hd1440"
    | "hd2160"
    | "highres"
    | string;
  container: "flv" | "3gp" | "mp4" | "webm" | "ts";
};

export type Format =
  & BaseFormat
  & ({ has_video: false } | VideoFormat)
  & ({
    has_audio: false;
  } | AudioFormat);
