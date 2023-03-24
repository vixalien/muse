import {
  BADGE_LABEL,
  find_object_by_key,
  MENU_ITEMS,
  MRLIR,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  TEXT_RUN,
  TEXT_RUNS,
  THUMBNAILS,
  TOGGLE_MENU,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { _ } from "./browsing.ts";
import {
  parse_song_artists_runs,
  parse_song_menu_tokens,
  parse_song_runs,
} from "./songs.ts";
import { get_flex_column_item, get_menu_playlists } from "./util.ts";

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

/*

for (const result of results) {
    const data = result[MRLIR];
    let search_result: Record<string, any> = {};

    let result_type = passed_result_type;

    if (!result_type) {
      result_type = get_item_text(data, 1).toLowerCase();
      const result_types = ["artist", "playlist", "song", "video", "station"];
      const result_types_local = [
        _("artist"),
        _("playlist"),
        _("song"),
        _("video"),
        _("station"),
      ];

      // default to album since it's labeled with multiple values ('Single', 'EP' etc)
      if (!result_types_local.includes(result_type ?? "")) {
        const first_sub = j(get_flex_column_item(data, 1), "text.runs[0]");

        result_type = first_sub.navigationEndpoint ? "song" : "album";
      } else {
        result_type =
          result_types[result_types_local.indexOf(result_type ?? "")];
      }
    }

    search_result.type = result_type;

    if (result_type != "artist") {
      search_result.title = get_item_text(data, 0);
    }

    if (result_type == "artist") {
      search_result.artist = get_item_text(data, 0);
      search_result.subscribers =
        jo(data, "flexColumns[1]", MRLITFC, "runs[2].text")?.split(" ")[0];
      search_result = { ...search_result, ...get_menu_playlists(data) };
    } else if (result_type == "album") {
      search_result.type = "album";
      search_result.album_type = get_item_text(data, 1).toLowerCase();
    } else if (result_type == "playlist") {
      const flex_item = get_flex_column_item(data, 1).text.runs;
      const has_author = flex_item.length == default_offset + 3;
      search_result.songs = j(
        flex_item,
        (default_offset + Number(has_author) * 2).toString(),
        "text",
      ).split(" ")[0];
      search_result.author = has_author
        ? j(flex_item, default_offset.toString(), "text")
        : null;
    } else if (result_type == "station") {
      search_result.videoId = j(data, NAVIGATION_VIDEO_ID);
      search_result.playlistId = j(data, NAVIGATION_PLAYLIST_ID);
    } else if (result_type == "song") {
      search_result.album = null;
      if ("menu" in data) {
        const toggle_menu = find_object_by_key(
          j(data, MENU_ITEMS),
          TOGGLE_MENU,
        );
        if (toggle_menu != null) {
          search_result.feedbackTokens = parse_song_menu_tokens(toggle_menu);
        }
      }
    } else if (result_type == "video") {
      search_result.views = null;
      search_result.videoType = jo(data, PLAY_BUTTON, NAVIGATION_VIDEO_TYPE);
    } else if (result_type == "upload") {
      const browse_id = jo(data, NAVIGATION_BROWSE_ID);

      if (!browse_id) {
        // song result
        const flex_items = [...Array(2).keys()].map((i) =>
          jo(get_flex_column_item(data, i), "text.runs")
        );

        if (flex_items[0]) {
          search_result.videoId = jo(flex_items[0][0], NAVIGATION_VIDEO_ID);
          search_result.playlistId = jo(
            flex_items[0][0],
            NAVIGATION_PLAYLIST_ID,
          );
        }

        if (flex_items[1]) {
          search_result = {
            ...search_result,
            ...parse_song_runs(flex_items[1]),
          };
        }
        search_result.type = "song";
      } else {
        // artist or album result
        search_result.browseId = browse_id;

        if (search_result.browseId.includes("artist")) {
          search_result.type = "artist";
        } else {
          const flex_item = get_flex_column_item(data, 1);
          const runs = flex_item.text.runs
            .filter((_: any, i: number) => i % 2 == 0)
            .map((run: any) => run.text);

          if (runs.length > 1) {
            // TODO: validate this
            search_result.release_date = runs[1];
          }
          if (runs.length > 2) {
            // artist may be missing
            search_result.artist = runs[2];
          }

          search_result.type = "album";
        }
      }
    }

    if (["song", "video"].includes(result_type)) {
      search_result.videoId = jo(
        data,
        PLAY_BUTTON,
        "playNavigationEndpoint.watchEndpoint.videoId",
      );
      search_result.videoType = jo(
        data,
        PLAY_BUTTON,
        "playNavigationEndpoint",
        NAVIGATION_VIDEO_TYPE,
      );
    }

    if (["song", "video", "album"].includes(result_type)) {
      search_result.duration = null;
      search_result.year = null;

      const flex_item = get_flex_column_item(data, 1);
      const first_run = jo(flex_item, "text.runs[0]");

      const has_offset = result_type == "album" ||
        (default_offset && search_result.videoId != null &&
          !first_run.navigationEndpoint);

      const runs = flex_item.text.runs.slice(2 * Number(has_offset));

      search_result = {
        ...search_result,
        ...parse_song_runs(runs),
      };
    }

    if (["artist", "album", "playlist"].includes(result_type)) {
      search_result.browseId = jo(data, NAVIGATION_BROWSE_ID);

      if (!search_result.browseId) {
        continue;
      }
    }

    if (["song", "album"].includes(result_type)) {
      search_result.isExplicit = jo(data, BADGE_LABEL) != null;
    }

    search_result.thumbnails = jo(data, THUMBNAILS);
    search_results.push(search_result);
  }

*/

export function parse_search_album(result: any) {
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

export function parse_search_video(result: any) {
  return {
    ...parse_search_song(result),
    type: "video",
  };
}

export function parse_search_song(result: any) {
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
    feedbackTokens: parse_song_menu_tokens(toggle_menu),
    videoType: j(
      result,
      PLAY_BUTTON,
      "playNavigationEndpoint",
      NAVIGATION_VIDEO_TYPE,
    ),
    ...parse_song_runs(flex1.text.runs),
  };
}

export function parse_search_artist(result: any) {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  return {
    type: "artist",
    name: j(title, "text"),
    subscribers: flex1.text.runs[2]?.text.split(" ")[0] ?? null,
    browseId: j(result, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAILS),
    ...get_menu_playlists(result),
  };
}

export function parse_search_playlist(result: any) {
  const flex = get_flex_column_item(result, 0);
  const flex1 = get_flex_column_item(result, 1);

  const title = j(flex, TEXT_RUN);

  const authors = parse_song_artists_runs(flex1.text.runs.slice(0, -1));

  return {
    type: "playlist",
    title: j(title, "text"),
    songs: flex1.text.runs[2]?.text.split(" ")[0] ?? null,
    authors,
    browseId: j(result, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAILS),
  };
}

export function parse_search_content(result: any) {
  return result;
}

export function parse_search_results2(
  results: any[],
  scope: Scope | null,
  filter: Filter | null,
  bottom_params: string | null,
) {
  const search_results: any[] = [];

  let parser: (e: any) => any;

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
    parser = parse_search_content;
  }

  for (const result of results) {
    const data = result[MRLIR];

    search_results.push(parser(data));
  }

  return search_results;
}
