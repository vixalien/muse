import { expect } from "jsr:@std/expect";
import { describe, test } from "jsr:@std/testing/bdd";

import { parse_music_carousel_shelf_renderer } from "./shelf_renderer.ts";
import { sampleThumbnail } from "../thumbnail/thumbnails.test.ts";

describe("parse_music_carousel_shelf_renderer", () => {
  const thumbnails = [sampleThumbnail];

  const result = parse_music_carousel_shelf_renderer({
    musicCarouselShelfRenderer: {
      header: {
        musicCarouselShelfBasicHeaderRenderer: {
          title: { runs: [{ text: "Title" }] },
          strapline: { runs: [{ text: "Subtitle" }] },
          thumbnail: {
            musicThumbnailRenderer: {
              thumbnail: {
                thumbnails,
              },
            },
          },
        },
      },
      contents: "Contents",
    },
  });

  test("title", () => {
    expect(result.title).toBe("Title");
  });

  test("subtitle", () => {
    expect(result.subtitle).toBe("Subtitle");
  });

  test("thumbnails", () => {
    expect(result.thumbnails).toBe(thumbnails);
  });

  test("content", () => {
    expect(result.contents).toBe("Contents");
  });
});
