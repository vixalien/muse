import {
  get_continuations,
  get_validated_continuations,
  resend_request_until_valid,
  validate_response,
} from "../continuations.ts";
import {
  GRID,
  MTRIR,
  SECTION_LIST,
  SECTION_LIST_CONTINUATION,
  SINGLE_COLUMN,
} from "../nav.ts";
import {
  MixedItem,
  parse_content_list,
  parse_mixed_item,
  parse_playlist,
  ParsedPlaylist,
} from "../parsers/browsing.ts";
import {
  fetch_library_contents,
  get_library_contents,
  parse_albums,
  parse_artists,
  parse_library_songs,
  parse_toast,
  ParsedLibraryAlbum,
  ParsedLibraryArtist,
} from "../parsers/library.ts";
import { parse_playlist_items, PlaylistItem } from "../parsers/playlists.ts";
import { LikeStatus } from "../parsers/songs.ts";
import { j, jo } from "../util.ts";
import { Song } from "./browsing.ts";
import { get_playlist, GetPlaylistOptions, Playlist } from "./playlist.ts";
import {
  AbortOptions,
  check_auth,
  LibraryOrder,
  PaginationAndOrderOptions,
  PaginationOptions,
  prepare_library_sort_params,
  prepare_like_endpoint,
  prepare_order_params,
  randomString,
  validate_order_parameter,
} from "./utils.ts";
import { request, request_json } from "./_request.ts";

export interface GetLibraryOptions extends PaginationOptions {
  order?: LibraryOrder;
}

export interface Library {
  continuation: string | null;
  results: MixedItem[];
}

export async function get_library_items(
  browseId: string,
  tab_index: number,
  options: GetLibraryOptions = {},
): Promise<Library> {
  const { order, limit = 20, continuation } = options;

  await check_auth();
  const endpoint = "browse";
  const data: Record<string, unknown> = {
    browseId,
  };

  const order_continuation = prepare_library_sort_params(order);

  if (order_continuation) {
    data.continuation = order_continuation;
  }

  const library: Library = {
    continuation: null,
    results: [],
  };

  if (continuation) {
    library.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data, signal: options.signal });

    let grid: any;

    if (order_continuation) {
      grid = j(
        json,
        SECTION_LIST_CONTINUATION,
        `[${tab_index.toString()}]`,
        GRID,
      );
    } else {
      console.log("here");
      grid = j(
        json,
        SINGLE_COLUMN,
        "tabs",
        `[${tab_index.toString()}]`,
        "tabRenderer.content",
        SECTION_LIST,
        "[0]",
        GRID,
      );
    }

    const results = j(grid, "items") as any[];

    library.results = results.map((result: any) =>
      parse_mixed_item(j(result, MTRIR))
    );

    library.continuation = jo(
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
          signal: options.signal,
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

export interface LibraryPlaylists {
  playlists: ParsedPlaylist[];
  continuation: string | null;
}

export async function get_library_playlists(
  options: PaginationAndOrderOptions = {},
): Promise<LibraryPlaylists> {
  const { order, limit = 25, continuation } = options;

  await check_auth();

  const endpoint = "browse";
  const body: Record<string, any> = { browseId: "FEmusic_liked_playlists" };

  validate_order_parameter(order);

  if (order) body.params = prepare_order_params(order);

  const library_playlists: LibraryPlaylists = {
    playlists: [],
    continuation: continuation ?? null,
  };

  if (!continuation) {
    const json = await request_json(endpoint, {
      data: body,
      signal: options.signal,
    });

    const results = get_library_contents(json, GRID);
    library_playlists.playlists = parse_content_list(
      results.items.slice(1),
      parse_playlist,
    );

    if ("continuations" in results) {
      library_playlists.continuation = results;
    }
  }

  if (library_playlists.continuation) {
    const continued_data = await get_continuations(
      library_playlists.continuation,
      "gridContinuation",
      limit - library_playlists.playlists.length,
      (params) => {
        return request_json(endpoint, {
          data: body,
          params,
          signal: options.signal,
        });
      },
      (contents) => {
        return parse_content_list(contents, parse_playlist);
      },
    );

    library_playlists.continuation = continued_data.continuation;
    library_playlists.playlists.push(...continued_data.items);
  }

  return library_playlists;
}

export function get_library(
  options: GetLibraryOptions = {},
): Promise<Library> {
  return get_library_items("FEmusic_library_landing", 0, options);
}

export interface GetLibrarySongOptions extends PaginationAndOrderOptions {
  validate_responses?: boolean;
}

export interface LibrarySongs {
  items: PlaylistItem[];
  continuation: string | null;
}

export async function get_library_songs(
  options: GetLibrarySongOptions = {},
): Promise<LibrarySongs> {
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
    items: [],
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

    library_songs.items = response.parsed ?? [];
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
        limit - library_songs.items.length,
        per_page,
        request_continuations,
        parse_continuations,
      );

      library_songs.continuation = continued_data.continuation;
      library_songs.items.push(...continued_data.items);
    } else {
      const remaining_limit = limit == null
        ? null
        : limit - library_songs.items.length;

      const continued_data = await get_continuations(
        library_songs.continuation,
        "musicShelfContinuation",
        remaining_limit,
        request_continuations,
        parse_continuations,
      );

      library_songs.continuation = continued_data.continuation;
      library_songs.items.push(...continued_data.items);
    }
  }

  return library_songs;
}

export interface LibraryItems<T extends any> {
  continuation: string | null;
  items: T[];
}

export function get_library_albums(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<ParsedLibraryAlbum>> {
  return fetch_library_contents(
    "FEmusic_liked_albums",
    options,
    parse_albums,
    true,
  );
}

export function get_library_artists(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<ParsedLibraryArtist>> {
  return fetch_library_contents(
    "FEmusic_library_corpus_track_artists",
    options,
    parse_artists,
    false,
  );
}

export function get_library_subscriptions(
  options?: PaginationAndOrderOptions,
): Promise<LibraryItems<ParsedLibraryArtist>> {
  return fetch_library_contents(
    "FEmusic_library_corpus_artists",
    options,
    (results) => parse_artists(results, true),
    false,
  );
}

export async function get_liked_songs(
  options?: GetPlaylistOptions,
): Promise<Playlist> {
  await check_auth();

  return get_playlist("LM", options);
}

export function add_history_item(
  song: Song | string,
  options: AbortOptions = {},
): Promise<Response> {
  const url = typeof song === "string" ? song : song.videostatsPlaybackUrl;

  return request(url, {
    method: "get",
    params: {
      ver: "2",
      cpn: randomString(16),
      c: "WEB_REMIX",
    },
    signal: options.signal,
  });
}

export async function remove_history_items(
  feedbackTokens: string[],
): Promise<string | null> {
  await check_auth();

  const json = request_json("feedback", {
    data: { feedbackTokens },
  });

  return parse_toast(json);
}

export async function rate_song(
  videoId: string,
  status: LikeStatus,
): Promise<string | null> {
  await check_auth();

  const json = await request_json(prepare_like_endpoint(status), {
    data: {
      target: {
        videoId,
      },
    },
  });

  return parse_toast(json);
}

export async function edit_song_library_status(
  feedbackTokens: string[],
  options: AbortOptions = {},
): Promise<string | null> {
  await check_auth();

  const json = await request_json("feedback", {
    data: { feedbackTokens },
    signal: options.signal,
  });

  return parse_toast(json);
}

export async function rate_playlist(
  playlistId: string,
  status: LikeStatus,
): Promise<string | null> {
  await check_auth();

  const json = await request_json(prepare_like_endpoint(status), {
    data: {
      target: {
        playlistId,
      },
    },
  });

  return parse_toast(json);
}

export async function subscribe_artists(
  channelIds: string[],
): Promise<string | null> {
  await check_auth();

  const json = await request_json("subscription/subscribe", {
    data: {
      channelIds,
    },
  });

  return parse_toast(json);
}

export async function unsubscribe_artists(
  channelIds: string[],
): Promise<string | null> {
  await check_auth();

  const json = await request_json("subscription/unsubscribe", {
    data: {
      channelIds,
    },
  });

  return parse_toast(json);
}
