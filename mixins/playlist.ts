import {
  get_continuation_contents,
  get_continuation_params,
  get_continuations,
} from "../continuations.ts";
import {
  CAROUSEL,
  CONTENT,
  DESCRIPTION,
  MUSIC_SHELF,
  SECTION_LIST_CONTINUATION,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  SUBTITLE,
  SUBTITLE3,
  THUMBNAIL_CROPPED,
  THUMBNAIL_RENDERER,
  TITLE_TEXT,
} from "../nav.ts";
import {
  parse_content_list,
  parse_playlist,
  ParsedPlaylist,
} from "../parsers/browsing.ts";
import {
  parse_playlist_items,
  PlaylistItem,
  validate_playlist_id,
} from "../parsers/playlists.ts";
import { j, jo, sum_total_duration } from "../util.ts";
import {
  AbortOptions,
  check_auth,
  html_to_text,
  PaginationOptions,
} from "./utils.ts";
import { request_json } from "./_request.ts";
import { ArtistRun, parse_song_artists_runs } from "../parsers/songs.ts";
import { ERROR_CODE, MuseError } from "../errors.ts";

export type { PlaylistItem };

export interface GetPlaylistOptions extends AbortOptions {
  limit?: number;
  suggestions_limit?: number;
  related?: boolean;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface Playlist {
  id: string;
  privacy: "PUBLIC" | "PRIVATE" | "UNLISTED";
  editable: boolean;
  title: string;
  thumbnails: Thumbnail[];
  description: string | null;
  authors: ArtistRun[];
  /** can be `Playlist`, `Chart` or `Radio` */
  type: string;
  year: string | null;
  trackCount: number | null;
  duration: string | null;
  duration_seconds: number;
  tracks: PlaylistItem[];
  continuation: string | null;
  suggestions: PlaylistItem[];
  suggestions_continuation: string | null;
  related: ParsedPlaylist[];
}

export interface PlaylistSuggestions {
  suggestions: PlaylistItem[];
  continuation: string | null;
}

export async function get_playlist_suggestions(
  playlistId: string,
  continuation: string,
  options: Omit<PaginationOptions, "continuation"> = {},
): Promise<PlaylistSuggestions> {
  const { signal, limit = 6 } = options;

  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const continued_suggestions = await get_continuations(
    continuation,
    "musicShelfContinuation",
    limit,
    (params: any) => request_json(endpoint, { data, params, signal }),
    parse_playlist_items,
    undefined,
    true,
  );

  const suggestions: PlaylistSuggestions = {
    suggestions: continued_suggestions.items,
    continuation: continued_suggestions.continuation,
  };

  return suggestions;
}

export interface MorePlaylistTracks {
  tracks: PlaylistItem[];
  continuation: string | null;
}

export async function get_more_playlist_tracks(
  playlistId: string,
  continuation: string,
  options: Omit<PaginationOptions, "continuation">,
): Promise<MorePlaylistTracks> {
  const { signal, limit = 100 } = options;

  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const continued_data = await get_continuations(
    continuation,
    "musicPlaylistShelfContinuation",
    limit,
    (params: any) => request_json(endpoint, { data, params, signal }),
    (contents) => parse_playlist_items(contents),
  );

  const tracks: MorePlaylistTracks = {
    tracks: continued_data.items,
    continuation: continued_data.continuation,
  };

  return tracks;
}

export async function get_playlist(
  playlistId: string,
  options?: GetPlaylistOptions,
): Promise<Playlist> {
  const { limit = 100, related = false, suggestions_limit = 0, signal } =
    options || {};

  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const json = await request_json(endpoint, { data, signal });

  const results = j(
    json,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    "musicPlaylistShelfRenderer",
  );

  const own_playlist = "musicEditablePlaylistDetailHeaderRenderer" in
    json.header;

  const header = own_playlist
    ? json.header.musicEditablePlaylistDetailHeaderRenderer.header
      .musicDetailHeaderRenderer
    : json.header.musicDetailHeaderRenderer;

  const run_count = header.subtitle.runs.length;

  const trackCount = header.secondSubtitle.runs
    ? header.secondSubtitle.runs[0].text
    : null;

  const duration =
    header.secondSubtitle.runs && header.secondSubtitle.runs.length > 2
      ? header.secondSubtitle.runs[2].text
      : null;

  const playlist: Playlist = {
    id: results.playlistId,
    privacy: own_playlist
      ? json.header.musicEditablePlaylistDetailHeaderRenderer.editHeader
        .musicPlaylistEditHeaderRenderer.privacy
      : "PUBLIC",
    editable: own_playlist,
    title: j(header, TITLE_TEXT),
    thumbnails: j(header, THUMBNAIL_CROPPED),
    description: jo(header, DESCRIPTION),
    type: run_count > 0 ? j(header, SUBTITLE) : null,
    authors: run_count > 1
      ? parse_song_artists_runs(
        header.subtitle.runs.slice(2, run_count >= 5 ? -2 : undefined),
      )
      : [],
    year: run_count === 5 ? j(header, SUBTITLE3) : null,
    trackCount: trackCount,
    duration,
    duration_seconds: 0,
    tracks: parse_playlist_items(results.contents),
    continuation: null,
    suggestions: [],
    suggestions_continuation: null,
    related: [],
  };

  const request = (params: any) =>
    request_json(endpoint, { data, params, signal });

  // suggestions and related are missing e.g. on liked songs
  const section_list = j(json, SINGLE_COLUMN_TAB, "sectionListRenderer");

  if ("continuations" in section_list) {
    let params = get_continuation_params(section_list);

    if (own_playlist && (suggestions_limit > 0 || related)) {
      const suggested = await request(params);
      const continuation = j(suggested, SECTION_LIST_CONTINUATION);

      params = get_continuation_params(continuation);
      const suggestions_shelf = j(continuation, CONTENT, MUSIC_SHELF);

      playlist.suggestions = get_continuation_contents(
        suggestions_shelf,
        parse_playlist_items,
      );

      playlist.suggestions_continuation = j(
        suggestions_shelf,
        "continuations.0.reloadContinuationData.continuation",
      );

      const continued_suggestions = await get_playlist_suggestions(
        playlistId,
        suggestions_shelf,
        {
          limit: suggestions_limit - playlist.suggestions.length,
          signal,
        },
      );

      playlist.suggestions.push(...continued_suggestions.suggestions);
      playlist.suggestions_continuation = continued_suggestions.continuation;
    }

    if (related) {
      const response = await request(params);
      const continuation = jo(response, SECTION_LIST_CONTINUATION);

      if (continuation) {
        playlist.related = get_continuation_contents(
          j(continuation, CONTENT, CAROUSEL),
          (results: any) => parse_content_list(results, parse_playlist),
        );
      }
    }
  }

  if ("continuations" in results) {
    const continued_data = await get_more_playlist_tracks(
      playlistId,
      results,
      {
        limit: limit - playlist.tracks.length,
        signal,
      },
    );

    playlist.tracks.push(...continued_data.tracks);
    playlist.continuation = continued_data.continuation;
  }

  playlist.duration_seconds = sum_total_duration(playlist);

  return playlist;
}

type PlaylistPrivacyStatus = "PUBLIC" | "PRIVATE" | "UNLISTED";

interface CreatePlaylistOptions extends AbortOptions {
  description?: string;
  privacy_status?: PlaylistPrivacyStatus;
  video_ids?: string[];
  source_playlist?: string;
}

export async function create_playlist(
  title: string,
  options: CreatePlaylistOptions = {},
): Promise<string> {
  const {
    description = "",
    privacy_status = "PUBLIC",
    video_ids,
    source_playlist,
    signal,
  } = options;

  await check_auth();

  const data: Record<string, any> = {
    title,
    description: html_to_text(description),
    privacyStatus: privacy_status,
  };

  if (video_ids && video_ids.length > 0) {
    data.videoIds = video_ids;
  }

  if (source_playlist) {
    data.sourcePlaylistId = source_playlist;
  }

  const json = await request_json("playlist/create", { data, signal });

  return json.playlistId;
}

export interface EditPlaylistOptions extends AbortOptions {
  title?: string;
  description?: string;
  privacy_status?: PlaylistPrivacyStatus;
  move_items?: { setVideoId: string; positionBefore?: string }[];
  add_videos?: string[];
  remove_videos?: { videoId: string; setVideoId?: string }[];
  add_source_playlists?: string[];
  dedupe?: "check" | "drop_duplicate" | "skip";
}

export type EditPlaylistStatus = "STATUS_SUCCEEDED" | "STATUS_FAILED";

export interface EditPlaylistResult {
  status: EditPlaylistStatus;
  added: {
    videoId: string;
    setVideoId: string;
  }[];
}

export async function edit_playlist(
  playlistId: string,
  options: EditPlaylistOptions,
): Promise<EditPlaylistResult> {
  const {
    title,
    description,
    privacy_status,
    move_items,
    add_videos,
    remove_videos,
    add_source_playlists,
    dedupe,
    signal,
  } = options;
  await check_auth();

  const data: Record<string, any> = {
    playlistId: validate_playlist_id(playlistId),
  };

  const actions: ({ action: string } & Record<string, any>)[] = [];

  const dedupeOption = dedupe === "check"
    ? "DEDUPE_OPTION_CHECK"
    : dedupe === "drop_duplicate"
    ? "DEDUPE_OPTION_DROP_DUPLICATE"
    : dedupe === "skip"
    ? "DEDUPE_OPTION_SKIP"
    : null;

  if (title) {
    actions.push({
      action: "ACTION_SET_PLAYLIST_NAME",
      playlistName: title,
    });
  }

  if (description) {
    actions.push({
      action: "ACTION_SET_PLAYLIST_DESCRIPTION",
      playlistDescription: description,
    });
  }

  if (privacy_status) {
    actions.push({
      action: "ACTION_SET_PLAYLIST_PRIVACY",
      playlistPrivacy: privacy_status,
    });
  }

  if (move_items) {
    move_items.forEach((move_item) => {
      actions.push({
        action: "ACTION_MOVE_VIDEO_BEFORE",
        setVideoId: move_item.setVideoId,
        movedSetVideoIdSuccessor: move_item.positionBefore,
      });
    });
  }

  if (add_videos) {
    add_videos.forEach((video_id) => {
      actions.push({
        action: "ACTION_ADD_VIDEO",
        addedVideoId: video_id,
        dedupeOption,
      });
    });
  }

  if (remove_videos) {
    remove_videos.forEach((remove_video) => {
      if (remove_video.setVideoId != null) {
        actions.push({
          action: "ACTION_REMOVE_VIDEO",
          removedVideoId: remove_video.videoId,
          setVideoId: remove_video.setVideoId,
        });
      } else {
        actions.push({
          action: "ACTION_REMOVE_VIDEO_BY_VIDEO_ID",
          removedVideoId: remove_video.videoId,
          setVideoId: remove_video.setVideoId,
        });
      }
    });
  }

  if (add_source_playlists) {
    add_source_playlists.forEach((playlist_id) => {
      actions.push({
        action: "ACTION_ADD_PLAYLIST",
        addedFullListId: playlist_id,
        dedupeOption,
      });
    });
  }

  data.actions = actions;

  console.log("data", data);

  const json = await request_json("browse/edit_playlist", { data, signal });

  const result: EditPlaylistResult = {
    added: [],
    status: json.status,
  };

  if ("playlistEditResults" in json) {
    for (const item of json.playlistEditResults) {
      if ("playlistEditVideoAddedResultData" in item) {
        const added = item.playlistEditVideoAddedResultData;

        result.added.push({
          videoId: j(added, "videoId"),
          setVideoId: j(added, "setVideoId"),
        });
      }
    }
  }

  return result;
}

export async function delete_playlist(
  playlistId: string,
  options: AbortOptions = {},
): Promise<EditPlaylistStatus> {
  await check_auth();

  const data = {
    playlistId: validate_playlist_id(playlistId),
  };

  const json = await request_json("playlist/delete", {
    data,
    signal: options.signal,
  });

  return json.status;
}

export interface AddPlaylistOptions extends AbortOptions {
  dedupe?: EditPlaylistOptions["dedupe"];
}

export function add_playlist_sources(
  playlistId: string,
  source_playlists: string[],
  options: AddPlaylistOptions = {},
): Promise<EditPlaylistResult> {
  return edit_playlist(playlistId, {
    add_source_playlists: source_playlists,
    ...options,
  });
}

export function add_playlist_items(
  playlistId: string,
  video_ids: string[],
  options: AddPlaylistOptions = {},
): Promise<EditPlaylistResult> {
  return edit_playlist(playlistId, { add_videos: video_ids, ...options });
}

export function remove_playlist_items(
  playlistId: string,
  video_ids: { videoId: string; setVideoId: string }[],
  options: AbortOptions = {},
): Promise<EditPlaylistResult> {
  return edit_playlist(playlistId, {
    remove_videos: video_ids,
    ...options,
  });
}

export interface AddToPlaylistItem {
  playlistId: string;
  title: string;
  thumbnails: Thumbnail[];
  songs: string;
}

export interface AddToPlaylist {
  recents: AddToPlaylistItem[];
  playlists: AddToPlaylistItem[];
}

export async function get_add_to_playlist(
  videoIds: string[] | null,
  playlistId: string | null = null,
  options: AbortOptions = {},
) {
  await check_auth();

  const { signal } = options;

  const endpoint = "playlist/get_add_to_playlist";
  const data: Record<string, any> = {
    excludeWatchLater: true,
  };

  if (videoIds != null) {
    data.videoIds = videoIds;
  } else if (playlistId != null) {
    data.playlistId = playlistId;
  } else {
    throw new MuseError(
      ERROR_CODE.INVALID_PARAMETER,
      "Either videoIds or playlistId must be provided",
    );
  }

  const result: AddToPlaylist = {
    recents: [],
    playlists: [],
  };

  const json = await request_json(endpoint, { data, signal });

  const contents = j(json, "contents.0.addToPlaylistRenderer");

  const recents = j(
    contents,
    "topShelf.musicCarouselShelfRenderer.contents",
  );

  for (const recent of recents) {
    const item = recent.musicTwoRowItemRenderer;

    if (!item) {
      continue;
    }

    result.recents.push({
      thumbnails: j(item, THUMBNAIL_RENDERER),
      playlistId: j(item, "navigationEndpoint.playlistEditEndpoint.playlistId"),
      songs: j(item, SUBTITLE),
      title: j(item, TITLE_TEXT),
    });
  }

  const playlists = j(contents, "playlists");

  for (const playlist of playlists) {
    const item = playlist.playlistAddToOptionRenderer;

    if (!item) {
      continue;
    }

    // Liked songs "LM" doesn't have a playlistId

    result.playlists.push({
      thumbnails: j(item, THUMBNAIL_RENDERER),
      playlistId: jo(
        item,
        "navigationEndpoint.playlistEditEndpoint.playlistId",
      ) ?? "LM",
      songs: j(item, "shortBylineText.runs").map((run: any) => run.text).join(
        "",
      ),
      title: j(item, TITLE_TEXT),
    });
  }

  return result;
}
