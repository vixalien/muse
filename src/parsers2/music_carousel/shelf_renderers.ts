import { RawJSON } from "../types.d.ts";
import { parse_music_carousel_shelf_renderer } from "./shelf_renderer.ts";

export function parse_music_carousel_shelf_renderers(content: RawJSON) {
  return content.map(parse_music_carousel_shelf_renderer);
}
