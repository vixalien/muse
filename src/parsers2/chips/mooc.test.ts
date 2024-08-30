import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_mood_chip } from "./mood.ts";

describe("parse_mood_chip", () => {
  const parsed = parse_mood_chip({
    chipCloudChipRenderer: {
      text: { runs: [{ text: "Mood Chip" }] },
      isSelected: false,
      navigationEndpoint: {
        browseEndpoint: {
          browseId: "MOOD_BROWSE_ID",
          params: "MOOD_PARAMS",
        },
      },
    },
  });

  it("parses title", () => {
    expect(parsed.text).toBe("Mood Chip")
  });

  it("parses selected", () => {
    expect(parsed.selected).toBe(false)
  });

  it("parses params", () => {
    expect(parsed.params).toBe("MOOD_PARAMS")
  });
});
