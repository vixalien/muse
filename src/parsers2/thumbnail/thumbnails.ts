import { RawJSON } from "../types.d.ts";

import { Thumbnail } from "./types.d.ts";

export type ParseThumbnailsResult = Thumbnail[];

export function parse_thumbnails(content: RawJSON): ParseThumbnailsResult {
  return content.thumbnail.thumbnails;
}
