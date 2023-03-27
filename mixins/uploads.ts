import { get_continuations } from "../continuations.ts";
import {
  MUSIC_SHELF,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  TITLE_TEXT,
} from "../nav.ts";
import {
  fetch_library_contents,
  parse_albums,
  parse_artists,
  ParsedLibraryAlbum,
  ParsedLibraryArtist,
} from "../parsers/library.ts";
import { parse_uploaded_items, UploadedItem } from "../parsers/uploads.ts";
import { j } from "../util.ts";
import { request_json } from "./_request.ts";
import {
  get_library_items,
  GetLibraryOptions,
  Library,
  LibraryItems,
} from "./library.ts";
import {
  check_auth,
  PaginationAndOrderOptions,
  PaginationOptions,
} from "./utils.ts";

export function get_library_upload_songs(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<UploadedItem>> {
  return fetch_library_contents(
    "FEmusic_library_privately_owned_tracks",
    options,
    parse_uploaded_items,
    false,
  );
}

export function get_library_upload_albums(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<ParsedLibraryAlbum>> {
  return fetch_library_contents(
    "FEmusic_library_privately_owned_releases",
    options,
    parse_albums,
    true,
  );
}

export function get_library_upload_artists(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<ParsedLibraryArtist>> {
  return fetch_library_contents(
    "FEmusic_library_privately_owned_artists",
    options,
    parse_artists,
    false,
  );
}

export function get_library_uploads(
  options: GetLibraryOptions = {},
): Promise<Library> {
  return get_library_items(
    "FEmusic_library_privately_owned_landing",
    1,
    options,
  );
}

export interface LibraryUploadArtist {
  name: string | null;
  items: UploadedItem[];
  continuation: string | null;
}

export async function get_library_upload_artist(
  browseId: string,
  options: PaginationOptions = {},
): Promise<LibraryUploadArtist> {
  const { limit = 20, continuation } = options;

  await check_auth();

  const data = { browseId };
  const endpoint = "browse";

  const artist: LibraryUploadArtist = {
    name: null,
    items: [],
    continuation: null,
  };

  if (!continuation) {
    const json = await request_json(endpoint, { data });
    const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST_ITEM, MUSIC_SHELF);

    artist.name = j(json, "header.musicHeaderRenderer", TITLE_TEXT);

    if (results.contents.length > 1) {
      results.contents.pop();
    }

    artist.items = parse_uploaded_items(results.contents);

    if ("continuations" in results) {
      artist.continuation = results;
    }
  }

  if (artist.continuation) {
    const continued_data = await get_continuations(
      artist.continuation,
      "musicShelfContinuation",
      limit - artist.items.length,
      (params) => request_json(endpoint, { data, params }),
      (contents) => parse_uploaded_items(contents),
    );

    artist.items.push(...continued_data.items);
    artist.continuation = continued_data.continuation;
  }

  return artist;
}
