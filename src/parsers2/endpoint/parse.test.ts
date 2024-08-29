import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_endpoint } from "./parse.ts";

import { sampleBrowseEndpoint } from "./endpoints/browse.test.ts";

describe("parseEndpoint", () => {
  it("has `endpoints` key", () => {
    expect(parse_endpoint({})).toHaveProperty("endpoints");
  });

  it("parses the browseEndpoint", () => {
    expect(
      parse_endpoint({ browseEndpoint: sampleBrowseEndpoint }).endpoints,
    ).toHaveProperty("browse");
  });
});
