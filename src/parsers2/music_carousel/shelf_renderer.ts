import { RawJSON } from "../types.d.ts";

import { Thumbnail } from "../thumbnail/types.d.ts";
import { parse_text_runs_simple } from "../runs/mod.ts";
import { parse_music_thumbnail_renderer } from "../thumbnail/mod.ts";

export interface ParseMusicCarouselShelfRendererResult {
  title: string;
  subtitle: string | null;
  thumbnails: Thumbnail[];
  contents: RawJSON[];
}

export function parse_music_carousel_shelf_renderer(
  content: RawJSON,
): ParseMusicCarouselShelfRendererResult {
  const renderer = content.musicCarouselShelfRenderer;

  const header = renderer.header.musicCarouselShelfBasicHeaderRenderer;
  const title = header.title;
  const subtitle = header.strapline;

  return {
    title: parse_text_runs_simple(title),
    subtitle: subtitle ? parse_text_runs_simple(subtitle) : null,
    thumbnails: header.thumbnail
      ? parse_music_thumbnail_renderer(header.thumbnail)
      : [],
    contents: renderer.contents,
  };
}
