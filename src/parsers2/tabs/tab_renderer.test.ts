import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_tab_renderer } from "./tab_renderer.ts";

export const sampleTab = {
  tabRenderer: {
    endpoint: {
      browseEndpoint: {
        browseId: "PSCBR_ID",
      },
    },
    title: "PSCBR Title",
    content: "Hello",
  },
};

describe("parse_tab_renderer", () => {
  const result = parse_tab_renderer(sampleTab);

  it("parses browseId", () => {
    expect(result.browseId).toBe("PSCBR_ID");
  });

  it("parses title", () => {
    expect(result.title).toBe("PSCBR Title");
  });

  it("parses content", () => {
    expect(result.content).toBe("Hello");
  });
});
