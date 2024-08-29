import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_browse_endpoint } from "./browse.ts";
import { EndpointType } from "../parse.ts";

export const sampleBrowseEndpoint = {
  browseId: "SOME_BROWSE_ID",
};

describe("browseEndpoint", () => {
  const parsed = parse_browse_endpoint(sampleBrowseEndpoint);

  it("has correct type", () => {
    expect(parsed.type).toBe(EndpointType.BROWSE);
  });

  it("parses ID", () => {
    expect(
      parse_browse_endpoint(sampleBrowseEndpoint),
    ).toHaveProperty("id", "SOME_BROWSE_ID");
  });

  it("parses params", () => {
    expect(
      parse_browse_endpoint({
        browseId: "SOME_BROWSE_ID",
        params: "SOME_PARAMS",
      }),
    ).toHaveProperty("params", "SOME_PARAMS");
  });
});
