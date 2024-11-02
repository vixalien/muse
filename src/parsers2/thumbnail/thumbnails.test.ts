import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { parse_thumbnails } from "./thumbnails.ts";

export const sampleThumbnail = {
  url: "THUMBNAIL_URL",
  width: 200,
  height: 100,
};

describe("parse_thumbnails", () => {
  it("parses a thumbnail", () => {
    expect(
      parse_thumbnails({
        thumbnail: {
          thumbnails: [sampleThumbnail],
        },
      })[0],
    ).toBeTruthy();
  });

  it("parses a number of thumbnails", () => {
    expect(parse_thumbnails({
      thumbnail: {
        thumbnails: [sampleThumbnail, sampleThumbnail, sampleThumbnail],
      },
    })).toHaveLength(3);
  });
});
