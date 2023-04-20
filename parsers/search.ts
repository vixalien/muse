import {
  BADGE_LABEL,
  find_object_by_key,
  MENU_ITEMS,
  MRLIR,
  NAVIGATION_BROWSE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  PAGE_TYPE,
  PLAY_BUTTON,
  SUBTITLE2,
  SUBTITLE_BADGE_LABEL,
  TEXT_RUN,
  TEXT_RUN_TEXT,
  TEXT_RUNS,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
  TOGGLE_MENU,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { _, __, AlbumType } from "./browsing.ts";
import {
  ArtistRun,
  MenuTokens,
  parse_song_artists_runs,
  parse_song_menu_tokens,
  parse_song_runs,
  SongRuns,
} from "./songs.ts";
import {
  get_flex_column_item,
  get_menu_playlists,
  MenuPlaylists,
  Thumbnail,
} from "./util.ts";

export const filters = [
  "albums",
  "artists",
  "playlists",
  "community_playlists",
  "featured_playlists",
  "songs",
  "videos",
] as const;

export type Filter = typeof filters[number];

export const scopes = ["library", "uploads"] as const;

export type Scope = typeof scopes[number];

export function get_search_params(
  filter: Filter | null = null,
  scope: Scope | null = null,
  autocorrect: boolean,
) {
  if (filter == null && scope == null && autocorrect) {
    return null;
  }

  switch (scope) {
    case null:
      if (autocorrect) {
        switch (filter) {
          case null:
            return null;
          case "songs":
          case "videos":
          case "albums":
          case "artists":
          case "playlists":
            return `EgWKAQI${_get_param2(filter)}AWoMEAMQBBAJEA4QChAF`;
          case "featured_playlists":
          case "community_playlists":
            return `EgeKAQQoA${_get_param2(filter)}BagwQAxAEEAkQDhAKEAU%3D`;
        }
      } else {
        switch (filter) {
          case null:
            return "QgIIAQ%3D%3D";
          case "songs":
          case "videos":
          case "albums":
          case "artists":
          case "playlists":
            return `EgWKAQI${_get_param2(filter)}AWoIEAMQBBAJEAo%3D`;
          case "featured_playlists":
            return `EgeKAQQoA${_get_param2(filter)}BaggQAxAEEAkQCg%3D%3D`;
        }
      }
      break;
    case "library":
      switch (filter) {
        case "artists":
        case "albums":
        case "songs":
          // note that `videos` is not supported here
          return `EgWKAQI${_get_param2(filter)}AWoIEAUQCRADGAQ%3D`;
        case "playlists":
          return "EgWKAQIoAWoEEAoYBA%3D%3D";
        default:
          return "agIYBA%3D%3D";
      }
      break;
    case "uploads":
      return "agIYAw%3D%3D";
  }
}

export function _get_param2(filter: Filter) {
  switch (filter) {
    case "songs":
      return "I";
    case "videos":
      return "Q";
    case "albums":
      return "Y";
    case "artists":
      return "g";
    case "playlists":
      return "o";
    case "featured_playlists":
      return "Dg";
    case "community_playlists":
      return "EA";
    default:
      throw Error("Invalid filter: " + filter);
  }
}

export interface SearchAlbum {
  type: "album";
  title: string;
  browseId: string;
  isExplicit: boolean;
  thumbnails: Thumbnail[];
  album_type: AlbumType;
  year: string | null;
  artists: ArtistRun[];
}

export function parse_search_album(result: any): SearchAlbum {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  const runs = j(flex1, TEXT_RUNS);

  return {
    type: "album",
    title: j(title, "text"),
    browseId: j(result, NAVIGATION_BROWSE_ID),
    isExplicit: jo(result, BADGE_LABEL) != null,
    thumbnails: j(result, THUMBNAILS),
    album_type: runs[0].text.toLowerCase(),
    year: runs[runs.length - 1].text,
    artists: parse_song_artists_runs(runs.slice(2, -1)),
  };
}

export interface SearchSongOrVideo extends SongRuns {
  type: "song" | "video";
  title: string;
  videoId: string;
  playlistId: string | null;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  feedbackTokens: MenuTokens | null;
  videoType: string;
}

export interface SearchSong extends SearchSongOrVideo {
  type: "song";
}

export function parse_search_song(result: any, has_label = false): SearchSong {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  const toggle_menu = find_object_by_key(
    j(result, MENU_ITEMS),
    TOGGLE_MENU,
  );

  return {
    type: "song",
    title: j(title, "text"),
    videoId: j(flex, TEXT_RUN, NAVIGATION_VIDEO_ID),
    playlistId: jo(title, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    isExplicit: jo(result, BADGE_LABEL) != null,
    feedbackTokens: toggle_menu ? parse_song_menu_tokens(toggle_menu) : null,
    videoType: j(
      result,
      PLAY_BUTTON,
      "playNavigationEndpoint",
      NAVIGATION_VIDEO_TYPE,
    ),
    ...parse_song_runs(flex1.text.runs, has_label ? 2 : 0),
  };
}

export interface SearchVideo extends SearchSongOrVideo {
  type: "video";
}

export function parse_search_video(
  result: any,
  has_label = false,
): SearchVideo {
  return {
    ...parse_search_song(result, has_label),
    type: "video",
  };
}

export interface SearchArtist extends MenuPlaylists {
  type: "artist";
  name: string;
  subscribers: string | null;
  browseId: string;
  thumbnails: Thumbnail[];
}

export function parse_search_artist(result: any): SearchArtist {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  return {
    type: "artist",
    name: j(title, "text"),
    subscribers: (flex1 && flex1.text.runs[2]?.text.split(" ")[0]) ?? null,
    browseId: j(result, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAILS),
    ...get_menu_playlists(result),
  };
}

export interface SearchPlaylist {
  type: "playlist";
  title: string;
  songs: string | null;
  authors: ArtistRun[];
  browseId: string;
  thumbnails: Thumbnail[];
}

export function parse_search_playlist(
  result: any,
  has_label = false,
): SearchPlaylist {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  const authors = parse_song_artists_runs(
    flex1.text.runs.slice(has_label ? 2 : 0, -1),
  );

  return {
    type: "playlist",
    title: j(title, "text"),
    songs: flex1.text.runs[2]?.text.split(" ")[0] ?? null,
    authors,
    browseId: j(result, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAILS),
  };
}

export interface SearchRadio {
  type: "radio";
  title: string;
  videoId: string;
  playlistId: string;
  thumbnails: Thumbnail[];
}

export function parse_search_radio(result: any): SearchRadio {
  const flex = get_flex_column_item(result, 0);
  const title = j(flex, TEXT_RUN);

  return {
    type: "radio",
    title: j(title, "text"),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    playlistId: j(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
  };
}

export type SearchContent =
  | SearchAlbum
  | SearchSong
  | SearchVideo
  | SearchArtist
  | SearchPlaylist
  | SearchRadio;

export function parse_search_content(
  result: any,
  upload = false,
  passed_entity?: string,
): SearchContent {
  const flex1 = get_flex_column_item(result, 1);

  // uploads artist won't have the second flex column
  const entity = passed_entity ||
    (flex1 ? __(j(flex1, TEXT_RUN_TEXT)) : "artist");

  let parser: (e: any, has_label?: boolean) => SearchContent;

  switch (entity) {
    case "station":
      parser = parse_search_radio;
      break;
    case "playlist":
      parser = parse_search_playlist;
      break;
    case "artist":
      parser = parse_search_artist;
      break;
    case "song":
      parser = parse_search_song;
      break;
    case "video":
      parser = parse_search_video;
      break;
    default:
      parser = (e: any) => {
        if (upload && flex1.text.runs.length > 3) {
          return parse_search_song(e);
        }

        return parse_search_album(e);
      };
  }

  return parser(result, true);
}

export function parse_search_results(
  results: any[],
  scope: Scope | null,
  filter: Filter | null,
) {
  const search_results: SearchContent[] = [];

  let parser: (e: any) => SearchContent;

  if (scope == null || scope == "library") {
    switch (filter) {
      case "albums":
        parser = parse_search_album;
        break;
      case "artists":
        parser = parse_search_artist;
        break;
      case "community_playlists":
      case "featured_playlists":
      case "playlists":
        parser = parse_search_playlist;
        break;
      case "songs":
        parser = parse_search_song;
        break;
      case "videos":
        parser = parse_search_video;
        break;
      case null:
        parser = parse_search_content;
    }
  } else {
    parser = (e: any) => parse_search_content(e, true);
  }

  for (const result of results) {
    const data = result[MRLIR];

    search_results.push(parser(data));
  }

  return search_results;
}

export function parse_top_result_more(result: any) {
  const more: SearchContent[] = [];

  if (!("contents" in result)) return more;

  const contents =
    j(result, "contents").map((content: any) =>
      content.musicResponsiveListItemRenderer
    ).filter(Boolean) ?? [];

  if (contents && contents.length > 0) {
    let last_entity: string | null = null;

    for (const content of contents) {
      const flex1 = get_flex_column_item(content, 1);

      const entity = flex1
        ? __(jo(flex1, TEXT_RUN_TEXT)) as string
        : null;

      if (entity) {
        more.push(parse_search_content(content, false));

        last_entity = entity;
      } else {
        try {
          more.push(
            parse_search_content(content, false, last_entity ?? undefined),
          );
        } catch {
          // try as song
          try {
            more.push(
              parse_search_content(content, false, "song"),
            );
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return more;
}

export interface TopResultArtist extends SearchArtist {
  more: SearchContent[];
}

export function parse_top_result_artist(result: any): TopResultArtist {
  const subscribers = jo(result, SUBTITLE2)?.split(" ")[0];

  const buttons = j(result, "buttons").map((button: any) =>
    button.buttonRenderer
  );

  const shuffleButton = buttons.find((button: any) =>
    button.icon.iconType === "MUSIC_SHUFFLE"
  );
  const radioButton = buttons.find((button: any) =>
    button.icon.iconType === "MIX"
  );

  return {
    type: "artist",
    name: j(result, TITLE_TEXT),
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: j(result, THUMBNAILS),
    shuffleId: j(shuffleButton, "command.watchPlaylistEndpoint.playlistId"),
    radioId: j(radioButton, "command.watchPlaylistEndpoint.playlistId"),
    more: parse_top_result_more(result),
  };
}

export interface TopResultSong extends SearchSong {
  more: SearchContent[];
}

export function parse_top_result_song(result: any): TopResultSong {
  const toggle_menu = find_object_by_key(
    j(result, MENU_ITEMS),
    TOGGLE_MENU,
  );

  return {
    type: "song",
    title: j(result, TITLE_TEXT),
    videoId: j(result, TITLE, NAVIGATION_VIDEO_ID),
    playlistId: jo(result, TITLE, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    feedbackTokens: toggle_menu ? parse_song_menu_tokens(toggle_menu) : null,
    videoType: j(result, TITLE, "navigationEndpoint", NAVIGATION_VIDEO_TYPE),
    ...parse_song_runs(result.subtitle.runs),
    more: parse_top_result_more(result),
  };
}

export interface TopResultAlbum extends SearchAlbum {
  more: SearchContent[];
}

export function parse_top_result_album(result: any): TopResultAlbum {
  return {
    type: "album",
    title: j(result, TITLE_TEXT),
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAILS),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    // TODO: stop lowercasing for no reason (album_type, category title etc...)
    album_type: result.subtitle.runs[0].text,
    year: null,
    artists: parse_song_artists_runs(result.subtitle.runs.slice(2, -1)),
    more: parse_top_result_more(result),
  };
}

export type TopResult = TopResultSong | TopResultAlbum | TopResultArtist;

export function parse_top_result(result: any) {
  const page_type = jo(result, TITLE, NAVIGATION_BROWSE, PAGE_TYPE);

  switch (page_type) {
    case "MUSIC_PAGE_TYPE_ARTIST":
      return parse_top_result_artist(result);
    case "MUSIC_PAGE_TYPE_ALBUM":
      return parse_top_result_album(result);
    default:
      if (
        jo(result, TITLE, "navigationEndpoint", NAVIGATION_VIDEO_TYPE) != null
      ) {
        return parse_top_result_song(result);
      } else {
        console.warn("unsupported search top result", page_type);
        return null;
      }
  }
}
