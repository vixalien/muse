import { expect } from "jsr:@std/expect";
import { describe, it } from "jsr:@std/testing/bdd";

import { sampleThumbnail } from "./thumbnails.test.ts";

import { parse_music_thumbnail_renderer } from "./music.ts";

describe("parse_music_thumbnail_renderer", () => {
  it("parses thumbnails", () => {
    const thumbnails = [sampleThumbnail];
    expect(
      parse_music_thumbnail_renderer({
        musicThumbnailRenderer: {
          thumbnail: {
            thumbnails,
          },
        },
      }),
    ).toEqual(thumbnails);
  });
});
