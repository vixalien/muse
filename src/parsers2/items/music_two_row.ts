import { RawJSON } from "../types.d.ts";

import { parse_navigation_endpoint } from "../endpoint/mod.ts";
import { parse_text_runs_simple } from "../runs/text_runs_simple.ts";
import { parse_music_thumbnail_renderer } from "../thumbnail/mod.ts";
import { Thumbnail } from "../thumbnail/types.d.ts";

export interface ParseMusicTwoRowItemRendererResult {
  thumbnails: Thumbnail[];
  title: string;
  subtitle: string;
  id?: string;
  pageType?: string;
}

export function parse_music_two_row_item_renderer(
  content: RawJSON,
): ParseMusicTwoRowItemRendererResult {
  const item = content.musicTwoRowItemRenderer;

  const title = item.title;
  const subtitle = item.subtitle;
  const titleNavigationEndpoint = title.runs[0].navigationEndpoint;
  const navigationEndpoint = titleNavigationEndpoint
    ? parse_navigation_endpoint(titleNavigationEndpoint)
    : null;

  return {
    thumbnails: parse_music_thumbnail_renderer(item.thumbnailRenderer),
    title: parse_text_runs_simple(title),
    id: navigationEndpoint?.id,
    pageType: navigationEndpoint?.pageType,
    subtitle: parse_text_runs_simple(subtitle),
    other: item,
  };
}
