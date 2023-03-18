import {
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CAROUSEL_TITLE,
  CATEGORY_COLOR,
  CATEGORY_PARAMS,
  CATEGORY_TITLE,
  FRAMEWORK_MUTATIONS,
  GRID,
  GRID_ITEMS,
  MUSIC_SHELF,
  NAVIGATION_PARAMS,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import {
  parse_chart_contents,
  parse_content_list,
  parse_explore_contents,
  parse_playlist,
} from "../parsers/browsing.ts";
import { color_to_hex } from "../parsers/util.ts";
import { j, jo } from "../util.ts";
import { request_json } from "./_request.ts";

export async function get_explore() {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_explore" },
  });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  return parse_explore_contents(results);
}

// any section may be missing
export async function get_charts(country?: string) {
  const endpoint = "browse";
  const data: Record<string, unknown> = { browseId: "FEmusic_charts" };

  if (country) {
    data.formData = {
      selectedValues: [country],
    };
  }

  const json = await request_json(endpoint, { data });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  const menu = j(
    results[0],
    MUSIC_SHELF,
    "subheaders.0.musicSideAlignedItemRenderer.startItems.0.musicSortFilterButtonRenderer",
  );

  return {
    countries: {
      selected: j(menu, TITLE),
      options: j(json, FRAMEWORK_MUTATIONS)
        .map((m: any) => jo(m, "payload.musicFormBooleanChoice.opaqueToken"))
        .filter(Boolean),
    },
    results: parse_chart_contents(results),
  };
}

export async function get_mood_categories() {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_moods_and_genres" },
  });

  return {
    categories: j(json, SINGLE_COLUMN_TAB, SECTION_LIST)
      .map((section: any) => {
        const title = j(section, GRID, "header.gridHeaderRenderer", TITLE_TEXT);
        const items = j(
          section,
          GRID_ITEMS,
        )
          .map((category: any) => {
            return {
              title: j(category, CATEGORY_TITLE, "0.text"),
              color: color_to_hex(j(category, CATEGORY_COLOR)),
              params: j(category, CATEGORY_PARAMS),
            };
          });

        return { title, items };
      }),
  };
}

export async function get_mood_playlists(params: string) {
  const json = await request_json("browse", {
    data: {
      browseId: "FEmusic_moods_and_genres_category",
      params,
    },
  });

  const categories = [];

  for (const section of j(json, SINGLE_COLUMN_TAB, SECTION_LIST)) {
    let path: string | null = null;
    let title: string | null = null;
    let params: string | null = null;

    if ("gridRenderer" in section) {
      path = GRID_ITEMS;
      title = j(section, GRID, "header.gridHeaderRenderer", TITLE_TEXT);
    } else if ("musicCarouselShelfRenderer" in section) {
      path = CAROUSEL_CONTENTS;
      title = j(section, CAROUSEL, CAROUSEL_TITLE, "text");
      params = j(section, CAROUSEL, CAROUSEL_TITLE, NAVIGATION_PARAMS);
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

  return {
    title: j(json, "header.musicHeaderRenderer", TITLE_TEXT),
    categories,
  };
}
