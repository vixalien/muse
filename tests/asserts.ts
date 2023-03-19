import { assert, assertArrayIncludes, assertEquals } from "./util.ts";

export function assertThumbnails(thumbnails: any, top_id?: string) {
  assert(thumbnails.length > 0);

  // tests correctness of thumbnails
  thumbnails.forEach((thumbnail: any, id: number) => {
    const str = id ? `${top_id ? `${top_id}: ` : ""}thumbnail ${id} ` : "";

    assertEquals(typeof thumbnail.url, "string", str + "url must be a string");
    assertEquals(
      new URL(thumbnail.url).href,
      thumbnail.url,
      "url must be a valid URL",
    );

    assertEquals(
      typeof thumbnail.width,
      "number",
      str + "width must be a number",
    );

    assertEquals(
      typeof thumbnail.height,
      "number",
      str + "width must be a number",
    );
  });
}

export function assertAlbum(album: any) {
  // const str = id ? `album ${id}: ` : id;

  // title
  assertEquals(typeof album.title, "string", "title must be a string");
  assert(album.title.length > 0, "title must not be blank");

  // year
  assertArrayIncludes(
    ["number", "null"],
    [typeof album.year],
    "year must be a number or a null",
  );

  // browseId
  assertEquals(typeof album.browseId, "string", "browseId must be a string");
  assert(album.browseId.length > 0, "browseId must not be blank");
  assertEquals(album.browseId.slice(0, 6), "MPREb_");

  // thumbnails
  assertThumbnails(album.thumbnails);

  // isExplicit
  assertEquals(
    typeof album.isExplicit,
    "boolean",
    "isExplicit must be a boolean",
  );

  // album_type
  assertEquals(
    typeof album.album_type,
    "string",
    "album_type must be a string",
  );
  assertArrayIncludes(
    ["single", "album", "ep"],
    [album.album_type],
    "album_type must be either 'single' or 'album' or 'ep",
  );

  // artists
  album.artists.forEach((artist: any, id: number) => {
    // name
    assertEquals(
      typeof artist.name,
      "string",
      `artist ${id}: name must be a string`,
    );

    // id
  });
}
