import { RawJSON } from "../types.d.ts";
import { parse_music_thumbnail_renderer } from "./music.ts";

import { Thumbnail } from "./types.d.ts";

export interface ParseBackgroundResult {
  thumbnails: Thumbnail[];
}

export function parse_background(content: RawJSON): ParseBackgroundResult {
  return {
    thumbnails: parse_music_thumbnail_renderer(content.background),
  };
}
