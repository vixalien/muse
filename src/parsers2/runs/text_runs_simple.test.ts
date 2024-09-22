import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_text_runs_simple } from "./text_runs_simple.ts";

describe("parse_text_runs_simple", () => {
  it("parses", () => {
    expect(
      parse_text_runs_simple({
        runs: [
          {
            text: "Hello, World!",
          },
        ],
      }),
    ).toBe("Hello, World!");
  });
});
