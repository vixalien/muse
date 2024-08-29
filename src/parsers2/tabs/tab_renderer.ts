import { assert, assertEquals } from "jsr:@std/assert";

import { RawJSON } from "../types.d.ts";

import { parseEndpoint } from "../endpoint/mod.ts";

export interface ParseTabRendererResult {
  browseId: string;
  title: string;
  content: RawJSON;
}

export function parse_tab_renderer(content: RawJSON): ParseTabRendererResult {
  const tab = content.tabRenderer;
  const browseEndpoint = parseEndpoint(tab.endpoint).endpoints.browse;

  assert(
    browseEndpoint,
    "singleColumnBrowseResultsRenderer must have a browseId",
  );

  const { title } = tab;

  // assertions
  assertEquals(typeof title, "string", "Tab must have a title");
  assert(tab.content, "Tab must have content");

  return {
    browseId: browseEndpoint.id,
    title,
    content: tab.content,
  };
}
