import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { sampleThumbnail } from "./thumbnails.test.ts";

import { parse_background } from "./background.ts";

describe("parse_background", () => {
  it("parses thumbnails", () => {
    const thumbnails = [sampleThumbnail];
    expect(
      parse_background({
        background: {
          musicThumbnailRenderer: {
            thumbnail: {
              thumbnails,
            },
          },
        },
      }).thumbnails,
    ).toEqual(thumbnails);
  });
});
