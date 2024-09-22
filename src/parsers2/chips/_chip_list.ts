import { Parser, RawJSON } from "../types.d.ts";

export function _parse_chips_list<T>(content: RawJSON, parser: Parser<T>): T[] {
  const chips = content.chipCloudRenderer.chips;

  return chips.map(parser);
}
