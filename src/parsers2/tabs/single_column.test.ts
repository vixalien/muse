import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_single_column_browse_results_renderer } from "./single_column.ts";
import { sampleTab } from "./tab_renderer.test.ts";

describe("parse_single_column_browse_results_renderer", () => {
  const result = parse_single_column_browse_results_renderer({
    singleColumnBrowseResultsRenderer: {
      tabs: [
        sampleTab,
      ],
    },
  });

  it("parses tab", () => {
    expect(result).toHaveProperty("tab");
  });
});
