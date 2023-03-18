import { assertEquals, it } from "../util.ts";

import * as util from "../../parsers/util.ts";

it("parse_duration", () => {
  assertEquals(util.parse_duration("1:23"), 83);
  assertEquals(util.parse_duration("1:23:45"), 5025);
  assertEquals(util.parse_duration("0:32"), 32);
  assertEquals(util.parse_duration("3:28"), 208);
  assertEquals(util.parse_duration("7:41"), 461);
});

it("color_to_hex", () => {
  assertEquals(util.color_to_hex(4293020416), "#e24b00");
  assertEquals(util.color_to_hex(4286267099), "#7b3edb");
  assertEquals(util.color_to_hex(4294967295), "#ffffff");
});
