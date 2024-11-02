import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_continuations } from "./continuations.ts";

describe("parse_continuations", () => {
  const parsed = parse_continuations({
    continuations: [
      { nextContinuationData: { continuation: "NEXT_CONTINUATION" } },
      { reloadContinuationData: { continuation: "RELOAD_CONTINUATION" } },
    ],
  });

  it("parses next continuation", () => {
    expect(parsed.nextContinuation).toBe("NEXT_CONTINUATION");
  });

  it("parses reload continuation", () => {
    expect(parsed.reloadContinuation).toBe("RELOAD_CONTINUATION");
  });

  it("does not parse undefined continuation", () => {
    expect(parsed.undefinedContinuation).toBeUndefined();
  });
});
