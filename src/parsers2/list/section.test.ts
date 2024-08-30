import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_section_list } from "./section.ts";

describe("parse_section_list", () => {
  const parsed = parse_section_list({
    sectionListRenderer: {
      header: "SECTION_LIST_HEADER",
      contents: "SECTION_LIST_CONTENTS",
      continuations: [
        { nextContinuationData: { continuation: "SECTION_LIST_CONTINUATION" } },
      ],
    },
  });

  it("parses header", () => {
    expect(parsed.header).toBe("SECTION_LIST_HEADER");
  });

  it("parses contents", () => {
    expect(parsed.contents).toBe("SECTION_LIST_CONTENTS");
  });

  it("parses next continuation", () => {
    expect(parsed.nextContinuation).toBe("SECTION_LIST_CONTINUATION");
  });
});
