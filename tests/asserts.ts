import { assert, assertEquals } from "./util.ts";

export function assertThumbnails(thumbnails: any) {
  assert(thumbnails.length > 0);

  // tests correctness of thumbnails
  thumbnails.forEach((thumbnail: any) => {
    assertEquals(typeof thumbnail.url, "string", "url must be a string");
    assertEquals(
      new URL(thumbnail.url).href,
      thumbnail.url,
      "url must be a valid URL",
    );

    assertEquals(typeof thumbnail.width, "number", "width must be a number");

    assertEquals(typeof thumbnail.height, "number", "width must be a number");
  });
}

