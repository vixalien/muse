import { j } from "../../util.ts";
import { RawJSON } from "../types.d.ts";

import { ParseTabRendererResult } from "./tab_renderer.ts";
import { parse_tab_renderer } from "./tab_renderer.ts";

export interface ParseSingleColumnBrowseResultsRendererResult {
  tab: ParseTabRendererResult;
}

export function parse_single_column_browse_results_renderer(
  content: RawJSON,
): ParseSingleColumnBrowseResultsRendererResult {
  const tab = j(content, "singleColumnBrowseResultsRenderer", "tabs", "0");

  return {
    tab: parse_tab_renderer(tab),
  };
}
