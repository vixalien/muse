import { assert } from "jsr:@std/assert/assert";
import { RawJSON } from "../types.d.ts";

import { parse_chip } from "./chip.ts";
import { _parse_chips_list } from "./_chip_list.ts";

export interface ParseMoodChipResult {
  text: string;
  selected: boolean;
  params: string;
}

export function parse_mood_chip(content: RawJSON): ParseMoodChipResult {
  const chip = parse_chip(content);

  assert(chip.navigation.browse?.params, "mood chip must have browseId");

  return {
    text: chip.text,
    selected: chip.selected,
    params: chip.navigation.browse.params,
  };
}

export function parse_mood_chips(content: RawJSON) {
  return _parse_chips_list(content, parse_mood_chip);
}
