import { get_continuations } from "../continuations.ts";
import { GRID, MTRIR, SECTION_LIST, SINGLE_COLUMN_TAB } from "../nav.ts";
import { parse_mixed_item } from "../parsers/browsing.ts";
import { j } from "../util.ts";
import { request_json } from "./_request.ts";

export async function get_library(limit = 20, continuation?: string) {
  const endpoint = "browse";
  const data = {
    browseId: "FEmusic_library_landing",
  };

  const library: {
    continuation: string | null;
    results: any[];
  } = {
    continuation: null,
    results: [],
  };

  if (continuation) {
    library.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data });

    const grid = j(json, SINGLE_COLUMN_TAB, SECTION_LIST, "[0]", GRID);

    const results = j(grid, "items");

    library.results = results.map((result: any) =>
      parse_mixed_item(j(result, MTRIR))
    );

    library.continuation = j(
      grid,
      "continuations[0].nextContinuationData.continuation",
    );
  }

  if (library.continuation) {
    const continued_data = await get_continuations(
      library.continuation,
      "gridContinuation",
      limit - library.results.length,
      (params) => {
        return request_json(endpoint, {
          data,
          params,
        });
      },
      (contents) => {
        return contents.map((result: any) =>
          parse_mixed_item(j(result, MTRIR))
        );
      },
    );

    library.continuation = continued_data.continuation;
    library.results.push(...continued_data.items);
  }

  return library;
}
