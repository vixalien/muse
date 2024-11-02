import { RawJSON } from "../types.d.ts";
import { parse_thumbnails, ParseThumbnailsResult } from "./mod.ts";

export type ParseMusicThumbnailRendererResult = ParseThumbnailsResult;

export function parse_music_thumbnail_renderer(content: RawJSON) {
  return parse_thumbnails(content.musicThumbnailRenderer);
}
