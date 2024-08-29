import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parseEndpoint } from "./parse.ts";

import { sampleBrowseEndpoint } from "./endpoints/browse.test.ts";

describe("parseEndpoint", () => {
  it("has `endpoints` key", () => {
    expect(parseEndpoint({})).toHaveProperty("endpoints");
  });

  it("parses the browseEndpoint", () => {
    expect(
      parseEndpoint({ browseEndpoint: sampleBrowseEndpoint }).endpoints,
    ).toHaveProperty("browse");
  });
});
