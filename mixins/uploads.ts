import { get_continuations } from "../continuations.ts";
import { basename, extname } from "../deps.ts";
import { ERROR_CODE, MuseError } from "../errors.ts";
import {
  MUSIC_SHELF,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  TITLE_TEXT,
} from "../nav.ts";
import { AlbumHeader, parse_album_header } from "../parsers/albums.ts";
import {
  fetch_library_contents,
  parse_albums,
  parse_artists,
  ParsedLibraryAlbum,
  ParsedLibraryArtist,
} from "../parsers/library.ts";
import { parse_uploaded_items, UploadedItem } from "../parsers/uploads.ts";
import { j, sum_total_duration } from "../util.ts";
import { request, request_json } from "./_request.ts";
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

export interface LibraryUploadAlbum extends AlbumHeader {
  tracks: UploadedItem[];
}

export async function get_library_upload_album(
  browseId: string,
): Promise<LibraryUploadAlbum> {
  await check_auth();

  const data = { browseId };
  const endpoint = "browse";

  const json = await request_json(endpoint, { data });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST_ITEM, MUSIC_SHELF);

  const album: LibraryUploadAlbum = {
    ...parse_album_header(json),
    tracks: parse_uploaded_items(results.contents),
  };

  album.duration_seconds = sum_total_duration(album);

  return album;
}

/**
 * Upload song won't work yet, as the TV client can't do uploads
 */
export async function upload_song(
  filename: string,
  contents: Uint8Array,
) {
  await check_auth();

  // check for file type
  const supported_file_types = ["mp3", "m4a", "wma", "flac", "ogg"];
  if (!supported_file_types.includes(extname(filename).slice(1))) {
    throw new MuseError(
      ERROR_CODE.UPLOADS_INVALID_FILETYPE,
      "Unsupported file type",
    );
  }

  const get_upload_url = "https://upload.youtube.com/upload/usermusic/http";

  const filesize = contents.byteLength;

  const encoder = new TextEncoder();

  const get_response = await request(get_upload_url, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": filesize.toString(),
      "X-Goog-Upload-Protocol": "resumable",
    },
    raw_data: true,
    data: encoder.encode("filename=" + basename(filename)),
  });

  console.log("data");

  const upload_url = get_response.headers.get("X-Goog-Upload-URL")!;

  const response = await request(upload_url, {
    data: contents,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
    raw_data: true,
  });

  return response;
}
