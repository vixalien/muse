import { RawJSON } from "../types.d.ts";
import { parse_thumbnails } from "./thumbnails.ts";

import { Thumbnail } from "./types.d.ts";

export interface ParseBackgroundResult {
  thumbnails: Thumbnail[];
}

export function parse_background(content: RawJSON): ParseBackgroundResult {
  return {
    thumbnails: parse_thumbnails(content.background.musicThumbnailRenderer),
  };
}
