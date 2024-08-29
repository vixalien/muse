import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parseBrowseEndpoint } from "./browse.ts";
import { EndpointType } from "../parse.ts";

export const sampleBrowseEndpoint = {
  browseId: "SOME_BROWSE_ID",
};

describe("browseEndpoint", () => {
  const parsed = parseBrowseEndpoint(sampleBrowseEndpoint);

  it("has correct type", () => {
    expect(parsed.type).toBe(EndpointType.BROWSE);
  });

  it("parses ID", () => {
    expect(
      parseBrowseEndpoint({ browseId: "SOME_BROWSE_ID" }).id,
    ).toBe("SOME_BROWSE_ID");
  });
});
