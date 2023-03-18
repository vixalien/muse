import {
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CAROUSEL_TITLE,
  GRID,
  GRID_ITEMS,
  NAVIGATION_PARAMS,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { parse_content_list, parse_playlist } from "./browsing.ts";

export function parse_playlists_categories(results: any) {
  const categories = [];

  for (const section of results) {
    let path: string | null = null;
    let title: string | null = null;
    let params: string | null = null;

    if ("gridRenderer" in section) {
      path = GRID_ITEMS;
      title = jo(section, GRID, "header.gridHeaderRenderer", TITLE_TEXT);
    } else if ("musicCarouselShelfRenderer" in section) {
      path = CAROUSEL_CONTENTS;
      title = j(section, CAROUSEL, CAROUSEL_TITLE, "text");
      params = jo(section, CAROUSEL, CAROUSEL_TITLE, NAVIGATION_PARAMS);
    } else if ("musicImmersiveCarouselShelfRenderer" in section) {
      path = "musicImmersiveCarouselShelfRenderer.contents";
      title = j(section, TITLE);
    }

    if (path) {
      const results = j(section, path);
      categories.push({
        title,
        params,
        playlists: parse_content_list(results, parse_playlist),
      });
    }
  }

  return categories;
}
