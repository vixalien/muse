import { request_json } from "../../mixins/_request.ts";

import { parse_single_column_browse_results_renderer } from "../../parsers2/tabs/mod.ts";

export async function get_home() {
  const json = await request_json("browse", {
    data: { browseId: "FEmusic_home" },
  });

  const tab = parse_single_column_browse_results_renderer(json.contents).tab;

  return tab;
}
