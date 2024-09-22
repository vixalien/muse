import { assertEquals } from "jsr:@std/assert";

import { RawJSON } from "../types.d.ts";

import { _parse_chips_list } from "./_chip_list.ts";
import { parse_endpoint, ParseEndpointResult } from "../endpoint/mod.ts";
import { parse_text_runs_simple } from "../runs/text_runs_simple.ts";

export interface ParseChipResult {
  /**
   * The text associated with this chip
   */
  text: string;
  /**
   * Whether this chip is selected or not
   */
  selected: boolean;
  /**
   * The endpoint to navigate to when this chip is clicked
   */
  navigation: ParseEndpointResult["endpoints"];
}

/**
 * Parses a chip, usually part of a chipCloud
 */
export function parse_chip(content: RawJSON): ParseChipResult {
  const chip = content.chipCloudChipRenderer;
  const selected = chip.isSelected;

  assertEquals(typeof selected, "boolean", "the chip must be selected or not");

  return {
    text: parse_text_runs_simple(chip.text),
    selected,
    navigation: parse_endpoint(chip.navigationEndpoint).endpoints,
  };
}

export function parse_chips(content: RawJSON) {
  return _parse_chips_list(content, parse_chip);
}
