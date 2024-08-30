import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { _parse_chips_list } from "./_chip_list.ts";

describe("_parse_chips_list", () => {
  const stub_parser = (t: string) => t;

  it("parses chips", () => {
    expect(
      _parse_chips_list(
        { chipCloudRenderer: { chips: ["hello"] } },
        stub_parser,
      )[0],
    ).toBe("hello");
  });

  it("produces expected amount of chips", () => {
    expect(
      _parse_chips_list(
        { chipCloudRenderer: { chips: ["hello", "world", "!"] } },
        stub_parser,
      ),
    ).toHaveLength(3);
  });
});
