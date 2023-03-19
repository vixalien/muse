import { get_continuations } from "../continuations.ts";
import { GRID, MTRIR, SECTION_LIST, SINGLE_COLUMN_TAB } from "../nav.ts";
import { MixedItem, parse_mixed_item } from "../parsers/browsing.ts";
import { j } from "../util.ts";
import { check_auth } from "./utils.ts";
import { request_json } from "./_request.ts";

export interface Library {
  continuation: string | null;
  results: MixedItem[];
}

export async function get_library(limit = 20, continuation?: string) {
  await check_auth();
  const endpoint = "browse";
  const data = {
    browseId: "FEmusic_library_landing",
  };

  const library: Library = {
    continuation: null,
    results: [],
  };

  if (continuation) {
    library.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data });

    const grid = j(json, SINGLE_COLUMN_TAB, SECTION_LIST, "[0]", GRID);

    const results = j(grid, "items") as any[];

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
