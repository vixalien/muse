import {
  CATEGORY_COLOR,
  CATEGORY_PARAMS,
  CATEGORY_TITLE,
  FRAMEWORK_MUTATIONS,
  GRID,
  GRID_ITEMS,
  MUSIC_SHELF,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  TITLE_TEXT,
} from "../nav.ts";
import {
  ChartContents,
  ExploreContents,
  MixedContent,
  parse_chart_contents,
  parse_explore_contents,
  parse_mixed_content,
} from "../parsers/browsing.ts";
import {
  parse_playlists_categories,
  PlaylistCategory,
} from "../parsers/explore.ts";
import { color_to_hex } from "../parsers/util.ts";
import { j, jo } from "../util.ts";
import { request_json } from "./_request.ts";
import { AbortOptions } from "./utils.ts";

export async function get_explore(
  options: AbortOptions = {},
): Promise<ExploreContents> {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_explore" },
    signal: options.signal,
  });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  return parse_explore_contents(results) as ExploreContents;
}

export interface Charts {
  countries: {
    selected: boolean;
    code: string;
    title: string;
  }[];
  results: ChartContents;
}

// any section may be missing
export async function get_charts(
  country?: string,
  options: AbortOptions = {},
): Promise<Charts> {
  const endpoint = "browse";
  const data: Record<string, unknown> = { browseId: "FEmusic_charts" };

  if (country) {
    data.formData = {
      selectedValues: [country],
    };
  }

  const json = await request_json(endpoint, { data, signal: options.signal });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  const menu = j(
    results[0],
    MUSIC_SHELF,
    "subheaders.0.musicSideAlignedItemRenderer.startItems.0.musicSortFilterButtonRenderer",
  );

  const menu_options = menu.menu.musicMultiSelectMenuRenderer.options
    .map((option: any) => {
      return option.musicMultiSelectMenuItemRenderer;
    })
    .filter(Boolean);

  const charts: Charts = {
    countries: j(json, FRAMEWORK_MUTATIONS)
      .map((m: any) => {
        const data = jo(m, "payload.musicFormBooleanChoice");

        if (!data) return;

        const menu_option = menu_options.find((o: any) =>
          o.formItemEntityKey === data.id
        );

        if (!menu_option) return;

        return {
          selected: data.selected,
          code: data.opaqueToken,
          title: j(menu_option, TITLE_TEXT),
        };
      })
      .filter(Boolean),
    results: parse_chart_contents(results),
  };

  return charts;
}

export interface MoodCategories {
  categories: {
    title: string;
    items: {
      title: string;
      color: string;
      params: string;
    }[];
  }[];
}

export async function get_mood_categories(
  options: AbortOptions = {},
): Promise<MoodCategories> {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_moods_and_genres" },
    signal: options.signal,
  });

  const mood_categories: MoodCategories = {
    categories: (j(json, SINGLE_COLUMN_TAB, SECTION_LIST) as any[])
      .map((section: any) => {
        const title = j(section, GRID, "header.gridHeaderRenderer", TITLE_TEXT);
        const items = (j(
          section,
          GRID_ITEMS,
        ) as any[])
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

  return mood_categories;
}

export interface MoodPlaylists {
  title: string;
  categories: PlaylistCategory[];
}

export async function get_mood_playlists(
  params: string,
  options: AbortOptions = {},
): Promise<MoodPlaylists> {
  const json = await request_json("browse", {
    data: {
      browseId: "FEmusic_moods_and_genres_category",
      params,
    },
    signal: options.signal,
  });

  const mood_playlists: MoodPlaylists = {
    title: j(json, "header.musicHeaderRenderer", TITLE_TEXT),
    categories: parse_playlists_categories(
      j(json, SINGLE_COLUMN_TAB, SECTION_LIST),
    ),
  };

  return mood_playlists;
}

export interface NewReleases {
  title: string;
  categories: MixedContent[];
}

export async function get_new_releases(
  options: AbortOptions = {},
): Promise<NewReleases> {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_new_releases" },
    signal: options.signal,
  });

  const new_releases: NewReleases = {
    title: j(json, "header.musicHeaderRenderer", TITLE_TEXT),
    categories: parse_mixed_content(j(json, SINGLE_COLUMN_TAB, SECTION_LIST)),
  };

  return new_releases;
}
