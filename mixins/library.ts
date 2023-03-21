import {
  get_continuations,
  get_validated_continuations,
  resend_request_until_valid,
  validate_response,
} from "../continuations.ts";
import { GRID, MTRIR, SECTION_LIST, SINGLE_COLUMN_TAB } from "../nav.ts";
import { MixedItem, parse_mixed_item } from "../parsers/browsing.ts";
import { parse_library_songs } from "../parsers/library.ts";
import { parse_playlist_items, PlaylistItem } from "../parsers/playlists.ts";
import { j } from "../util.ts";
import {
  check_auth,
  Order,
  prepare_order_params,
  validate_order_parameter,
} from "./utils.ts";
import { request_json } from "./_request.ts";

export interface Library {
  continuation: string | null;
  results: MixedItem[];
}

export async function get_library(limit = 20, continuation?: string) {
  await check_auth();
  const endpoint = "browse";
  const data = {
    browseId: "FEmusic_library_landing",
  };

  const library: Library = {
    continuation: null,
    results: [],
  };

  if (continuation) {
    library.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data });

    const grid = j(json, SINGLE_COLUMN_TAB, SECTION_LIST, "[0]", GRID);

    const results = j(grid, "items") as any[];

    library.results = results.map((result: any) =>
      parse_mixed_item(j(result, MTRIR))
    );

    library.continuation = j(
      grid,
      "continuations[0].nextContinuationData.continuation",
    );
  }

  if (library.continuation) {
    const continued_data = await get_continuations(
      library.continuation,
      "gridContinuation",
      limit - library.results.length,
      (params) => {
        return request_json(endpoint, {
          data,
          params,
        });
      },
      (contents) => {
        return contents.map((result: any) =>
          parse_mixed_item(j(result, MTRIR))
        );
      },
    );

    library.continuation = continued_data.continuation;
    library.results.push(...continued_data.items);
  }

  return library;
}

export interface GetLibrarySongOptions {
  limit?: number;
  continuation?: string;
  validate_responses?: boolean;
  order?: Order;
}

export interface LibrarySongs {
  songs: PlaylistItem[];
  continuation: string | null;
}

export async function get_library_songs(options: GetLibrarySongOptions = {}) {
  const { order, limit = 25, validate_responses = false, continuation } =
    options;

  await check_auth();

  const endpoint = "browse";
  const data: Record<string, any> = {
    browseId: "FEmusic_liked_videos",
  };
  const per_page = 25;

  validate_order_parameter(order);

  if (order) {
    data.params = prepare_order_params(order);
  }

  const request = (_params: Record<string, string> = {}) =>
    request_json(endpoint, {
      data,
    });
  const parse = (response: any) => parse_library_songs(response);

  const library_songs: LibrarySongs = {
    songs: [],
    continuation: continuation ?? null,
  };

  if (!continuation) {
    let response = null;

    if (validate_responses) {
      response = await resend_request_until_valid(
        request,
        {},
        parse,
        (parsed: any) => validate_response(parsed, per_page, limit, 0),
        3,
      );
    } else {
      response = parse(await request());
    }

    library_songs.songs = response.parsed ?? [];
    library_songs.continuation = response.results;
  }

  if (library_songs.continuation) {
    const request_continuations = (params: any) =>
      request_json(endpoint, { data, params });
    const parse_continuations = (contents: any) =>
      parse_playlist_items(contents);

    if (validate_responses) {
      const continued_data = await get_validated_continuations(
        library_songs.continuation,
        "musicShelfContinuation",
        limit - library_songs.songs.length,
        per_page,
        request_continuations,
        parse_continuations,
      );

      library_songs.continuation = continued_data.continuation;
      library_songs.songs.push(...continued_data.items);
    } else {
      const remaining_limit = limit == null
        ? null
        : limit - library_songs.songs.length;

      const continued_data = await get_continuations(
        library_songs.continuation,
        "musicShelfContinuation",
        remaining_limit,
        request_continuations,
        parse_continuations,
      );

      library_songs.continuation = continued_data.continuation;
      library_songs.songs.push(...continued_data.items);
    }
  }

  return library_songs;
}
