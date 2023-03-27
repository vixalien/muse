import {
  fetch_library_contents,
  parse_albums,
  parse_artists,
  ParsedLibraryAlbum,
  ParsedLibraryArtist,
} from "../parsers/library.ts";
import { parse_uploaded_items, UploadedItem } from "../parsers/uploads.ts";
import {
  get_library_items,
  GetLibraryOptions,
  Library,
  LibraryItems,
} from "./library.ts";
import { PaginationAndOrderOptions } from "./utils.ts";

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
