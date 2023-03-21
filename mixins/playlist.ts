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
  NAVIGATION_BROWSE_ID,
  SECTION_LIST_CONTINUATION,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  SUBTITLE2,
  SUBTITLE3,
  THUMBNAIL_CROPPED,
  TITLE_TEXT,
} from "../nav.ts";
import { parse_content_list, parse_playlist } from "../parsers/browsing.ts";
import {
  parse_playlist_items,
  PlaylistItem,
  validate_playlist_id,
} from "../parsers/playlists.ts";
import { j, jo, sum_total_duration } from "../util.ts";
import { check_auth, html_to_text } from "./utils.ts";
import { request_json } from "./_request.ts";

export interface GetPlaylistOptions {
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
  privacy: "PUBLIC" | "PRIVATE";
  title: string;
  thumbnails: Thumbnail[];
  description: string | null;
  author: {
    name: string;
    id: string;
  } | null;
  year: string | null;
  trackCount: number;
  duration_seconds: number;
  tracks: any[];
  continuation: string | null;
  suggestions: any;
  suggestions_continuation: string | null;
  related: any;
}

export interface PlaylistSuggestions {
  suggestions: PlaylistItem[];
  continuation: string | null;
}

export async function get_playlist_suggestions(
  playlistId: string,
  continuation: string | any,
  limit: number,
) {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const continued_suggestions = await get_continuations(
    continuation,
    "musicShelfContinuation",
    limit,
    (params: any) => request_json(endpoint, { data, params }),
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
  continuation: string | any,
  limit: number,
) {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const continued_data = await get_continuations(
    continuation,
    "musicPlaylistShelfContinuation",
    limit,
    (params: any) => request_json(endpoint, { data, params }),
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
) {
  const { limit = 100, related = false, suggestions_limit = 0 } = options || {};

  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const data = { browseId };
  const endpoint = "browse";

  const json = await request_json(endpoint, { data });

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

  const song_count = Number(
    header.secondSubtitle.runs[0].text.normalize("NFKD").split(" ")[0],
  );

  const playlist: Playlist = {
    id: results.playlistId,
    privacy: own_playlist
      ? json.header.musicEditablePlaylistDetailHeaderRenderer.editHeader
        .musicPlaylistEditHeaderRenderer.privacy
      : "PUBLIC",
    title: j(header, TITLE_TEXT),
    thumbnails: j(header, THUMBNAIL_CROPPED),
    description: jo(header, DESCRIPTION),
    author: run_count > 1
      ? {
        name: j(header, SUBTITLE2),
        id: jo(header, "subtitle.runs.2", NAVIGATION_BROWSE_ID),
      }
      : null,
    year: run_count === 5 ? j(header, SUBTITLE3) : null,
    trackCount: song_count,
    duration_seconds: 0,
    tracks: song_count > 0 ? parse_playlist_items(results.contents) : [],
    continuation: null,
    suggestions: [],
    suggestions_continuation: null,
    related: [],
  };

  const request = (params: any) => request_json(endpoint, { data, params });

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
        suggestions_limit - playlist.suggestions.length,
      );

      playlist.suggestions.push(...continued_suggestions.suggestions);
      playlist.suggestions_continuation = continued_suggestions.continuation;
    }

    if (related) {
      const response = await request(params);
      const continuation = j(response, SECTION_LIST_CONTINUATION);

      playlist.related = get_continuation_contents(
        j(continuation, CONTENT, CAROUSEL),
        (results: any) => parse_content_list(results, parse_playlist),
      );
    }
  }

  if (song_count > 0) {
    const songs_to_get = Math.min(limit ?? song_count, song_count);

    if ("continuations" in results) {
      const continued_data = await get_more_playlist_tracks(
        playlistId,
        results,
        songs_to_get - playlist.tracks.length,
      );

      playlist.tracks.push(...continued_data.tracks);
      playlist.continuation = continued_data.continuation;
    }
  }

  playlist.duration_seconds = sum_total_duration(playlist);

  return playlist;
}

type PlaylistPrivacyStatus = "PUBLIC" | "PRIVATE" | "UNLISTED";

interface CreatePlaylistOptions {
  description?: string;
  privacy_status?: PlaylistPrivacyStatus;
  video_ids?: string[];
  source_playlist?: string;
}

export async function create_playlist(
  title: string,
  options: CreatePlaylistOptions = {},
) {
  const {
    description = "",
    privacy_status = "PUBLIC",
    video_ids,
    source_playlist,
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

  const json = await request_json("playlist/create", { data });

  return json.playlistId;
}

export interface EditPlaylistOptions {
  title?: string;
  description?: string;
  privacy_status?: PlaylistPrivacyStatus;
  move_items?: { setVideoId: string; positionBefore?: string }[];
  add_videos?: string[];
  remove_videos?: { videoId: string; setVideoId: string }[];
  add_source_playlists?: string[];
}

export async function edit_playlist(
  playlistId: string,
  options: EditPlaylistOptions,
) {
  const {
    title,
    description,
    privacy_status,
    move_items,
    add_videos,
    remove_videos,
    add_source_playlists,
  } = options;
  await check_auth();

  const data: Record<string, any> = {
    playlistId: validate_playlist_id(playlistId),
  };

  const actions: ({ action: string } & Record<string, any>)[] = [];

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
      });
    });
  }

  if (remove_videos) {
    remove_videos.forEach((remove_video) => {
      actions.push({
        action: "ACTION_REMOVE_VIDEO",
        removedVideoId: remove_video.videoId,
        setVideoId: remove_video.setVideoId,
      });
    });
  }

  if (add_source_playlists) {
    add_source_playlists.forEach((playlist_id) => {
      actions.push({
        action: "ACTION_ADD_PLAYLIST",
        addedFullListId: playlist_id,
      });
    });
  }

  data.actions = actions;

  const json = await request_json("browse/edit_playlist", { data });

  return "status" in json ? json.status : json;
}

export async function delete_playlist(playlistId: string) {
  await check_auth();

  const data = {
    playlistId: validate_playlist_id(playlistId),
  };

  const json = await request_json("playlist/delete", { data });

  return "status" in json ? json.status : json;
}

export function add_playlist_sources(
  playlistId: string,
  source_playlists: string[],
) {
  return edit_playlist(playlistId, { add_source_playlists: source_playlists });
}

export function add_playlist_items(
  playlistId: string,
  video_ids: string[],
) {
  return edit_playlist(playlistId, { add_videos: video_ids });
}

export function remove_playlist_items(
  playlistId: string,
  video_ids: { videoId: string; setVideoId: string }[],
) {
  return edit_playlist(playlistId, {
    remove_videos: video_ids,
  });
}
