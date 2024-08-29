import { assert } from "jsr:@std/assert/assert";
import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { EndpointType } from "../endpoint/mod.ts";
import { parse_chip } from "./chip.ts";
import { RawJSON } from "../types.d.ts";

describe("parse_text_runs_simple", () => {
  const text = { runs: [{ text: "Chip Title" }] };

  function getChip(overrides: RawJSON) {
    return {
      chipCloudChipRenderer: {
        text,
        isSelected: false,
        navigationEndpoint: {},
        ...overrides,
      },
    };
  }

  describe("parses selected", () => {
    it("parses selected false", () => {
      expect(
        parse_chip(getChip({ isSelected: false })).selected,
      ).toBe(false);
    });

    it("parses selected false", () => {
      expect(
        parse_chip(getChip({ isSelected: true })).selected,
      ).toBe(true);
    });
  });

  it("parses text", () => {
    expect(
      parse_chip(getChip({ text: { runs: [{ text: "Hello, World!" }] } })).text,
    ).toBe("Hello, World!");
  });

  it("parses navigation", () => {
    const chip = parse_chip(getChip({
      navigationEndpoint: {
        browseEndpoint: {
          browseId: "BROWSE_ID",
          params: "PARAMS",
        },
      },
    }));

    assert(chip.navigation.browse, "must parse a browse endpoint");

    expect(
      chip.navigation.browse.type,
    ).toBe(EndpointType.BROWSE);
  });
});
