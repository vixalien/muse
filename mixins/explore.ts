import {
  FRAMEWORK_MUTATIONS,
  MUSIC_SHELF,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  TITLE,
} from "../nav.ts";
import { parse_chart_contents, parse_explore_contents } from "../parsers/browsing.ts";
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
