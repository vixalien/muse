import { RawJSON } from "../types.d.ts";

import { parse_continuations } from "../continuations/moc.ts";

export interface ParseSectionListResult {
  header: RawJSON;
  contents: RawJSON[];
  nextContinuation: string | null;
}

export function parse_section_list(content: RawJSON): ParseSectionListResult {
  const section_list = content.sectionListRenderer;
  const nextContinuation = parse_continuations(section_list).nextContinuation;

  return {
    header: section_list.header,
    contents: section_list.contents,
    nextContinuation: nextContinuation ?? null,
  };
}
