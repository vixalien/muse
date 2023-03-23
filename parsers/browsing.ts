import STRINGS from "../locales/strings.json" assert { type: "json" };

import {
  BADGE_LABEL,
  CAROUSEL,
  CAROUSEL_SUBTITLE,
  CAROUSEL_THUMBNAILS,
  CAROUSEL_TITLE,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  find_object_by_key,
  MENU_ITEMS,
  MRLIR,
  MRLITFC,
  MTRIR,
  NAVIGATION_BROWSE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  NAVIGATION_WATCH_PLAYLIST_ID,
  PAGE_TYPE,
  PLAY_BUTTON,
  RUN_TEXT,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_BADGE_LABEL,
  TEXT_RUN,
  TEXT_RUN_TEXT,
  TEXT_RUNS,
  THUMBNAIL_RENDERER,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
  TOGGLE_MENU,
} from "../nav.ts";
import { get_option } from "../setup.ts";
import { j, jo } from "../util.ts";
import {
  ArtistRun,
  parse_song_artists,
  parse_song_artists_runs,
  parse_song_menu_tokens,
  parse_song_runs,
  SongArtist,
  SongRuns,
} from "./songs.ts";
import {
  color_to_hex,
  get_dot_separator_index,
  get_flex_column_item,
  get_item_text,
  get_menu_playlists,
  Thumbnail,
} from "./util.ts";

export interface Mood {
  name: string;
  params: string;
}

export function parse_moods(results: any[]) {
  const moods: Mood[] = [];

  const chips = j(
    results,
    "sectionListRenderer.header.chipCloudRenderer.chips",
  );

  chips.forEach((chip: any) => {
    const renderer = j(chip, "chipCloudChipRenderer");

    moods.push({
      name: j(renderer, TEXT_RUN_TEXT),
      params: j(renderer, "navigationEndpoint.browseEndpoint.params"),
    });
  });

  return moods;
}

export type MixedItem =
  | ({
    type: "watch-playlist";
  } & WatchPlaylist)
  | ({
    type: "video";
  } & ParsedSong)
  | ({
    type: "song";
  } & ParsedSong)
  | ({
    type: "album";
  } & ParsedAlbum)
  | ({
    type: "artist";
  } & RelatedArtist)
  | ({
    type: "channel";
  } & RelatedArtist)
  | ({
    type: "flat-song";
  } & ParsedSong)
  | ({
    type: "song";
  } & FlatSong)
  | ({
    type: "playlist";
  } & ParsedPlaylist)
  | null;

export function parse_mixed_item(data: any) {
  let item: MixedItem = null;

  const page_type = jo(data, TITLE, NAVIGATION_BROWSE, PAGE_TYPE);
  switch (page_type) {
    case null:
    case undefined:
      // song or watch playlist
      if (jo(data, NAVIGATION_WATCH_PLAYLIST_ID) != null) {
        item = {
          type: "watch-playlist",
          ...parse_watch_playlist(data),
        };
      } else {
        const content = parse_song(data);
        if (content.views != null) {
          item = {
            type: "video",
            ...content,
          };
        } else {
          item = {
            type: "song",
            ...content,
          };
        }
      }
      break;
    case "MUSIC_PAGE_TYPE_ALBUM":
      item = {
        type: "album",
        ...parse_album(data),
      };
      break;
    case "MUSIC_PAGE_TYPE_USER_CHANNEL":
    case "MUSIC_PAGE_TYPE_ARTIST":
      item = {
        type: page_type === "MUSIC_PAGE_TYPE_USER_CHANNEL"
          ? "channel"
          : "artist",
        ...parse_related_artist(data),
      };
      break;
    case "MUSIC_PAGE_TYPE_PLAYLIST":
      item = {
        type: "playlist",
        ...parse_playlist(data),
      };
      break;
    default:
      console.error("Unknown page type", page_type);
  }

  return item;
}

export interface MixedContent {
  title: string | null;
  subtitle: string | null;
  thumbnails: Thumbnail[] | null;
  browseId: string | null;
  contents: string | MixedItem[];
}

export function parse_mixed_content(rows: any[]) {
  const items: MixedContent[] = [];

  for (const row of rows) {
    let title = null,
      contents,
      browseId = null,
      subtitle = null,
      thumbnails = null;

    if (DESCRIPTION_SHELF in row) {
      const results = j(row, DESCRIPTION_SHELF);
      // type = "description";
      title = j(results, "header", RUN_TEXT);
      contents = j(results, DESCRIPTION);
    } else {
      const results = Object.values(row)[0] as any;
      let children: any[];

      if (!("contents" in results)) {
        if ("items" in results) {
          children = results["items"];
        } else {
          continue;
        }
      } else {
        const carousel_title = j(results, CAROUSEL_TITLE);

        title = j(carousel_title, "text");
        browseId = jo(carousel_title, NAVIGATION_BROWSE_ID);
        subtitle = jo(results, CAROUSEL_SUBTITLE, "text");
        thumbnails = jo(results, CAROUSEL_THUMBNAILS);

        children = results["contents"];
      }

      contents = [];
      for (const result of children) {
        const data = jo(result, MTRIR);
        let item: MixedItem = null;

        if (data != null) {
          const mixed_item = parse_mixed_item(data);
          if (mixed_item != null) {
            item = mixed_item;
          }
        } else {
          const data = j(result, MRLIR);

          item = {
            type: "song",
            ...parse_song_flat(data),
          };
        }

        contents.push(item);
      }
    }

    items.push({
      title,
      subtitle,
      thumbnails,
      browseId,
      contents,
    });
  }

  return items;
}

export function parse_search_results(
  results: any[],
  passed_result_type: string | null = null,
) {
  const search_results = [];
  const default_offset = Number(!passed_result_type) * 2;

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
        j(data, "flexColumns[1]", MRLITFC, "runs[2].text")?.split(" ")[0];
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

  return search_results;
}

export type CategoryMap = Record<string, [string, (a: any) => any, string?]>;

export type Category<Return> = {
  browseId: string | null;
  params: string | null;
  results: Return[];
};

export function parse_categories<
  Map extends CategoryMap,
>(
  results: any[],
  categories_data: Map,
) {
  const categories: {
    [Key in keyof Map]: Category<
      ReturnType<
        Map[Key][1]
      >
    >;
  } = {} as any;

  for (const category in categories_data) {
    // const category = categories[i];
    const value = categories_data[category as keyof typeof categories_data];
    const category_local = value[0];
    const category_parser = value[1];
    const category_key = value[2];

    const data = results
      .filter((r) =>
        "musicCarouselShelfRenderer" in r &&
        j(r, `${CAROUSEL}.${CAROUSEL_TITLE}`).text.toLowerCase() ==
          category_local
      )
      .map((r) => r.musicCarouselShelfRenderer);

    if (data.length > 0) {
      const category_obj: Category<any> = {
        browseId: null,
        results: [],
        params: null,
      };

      if ("navigationEndpoint" in j(data[0], CAROUSEL_TITLE)) {
        category_obj.browseId = j(
          data[0],
          `${CAROUSEL_TITLE}.${NAVIGATION_BROWSE_ID}`,
        );

        if (["albums", "singles", "playlists"].includes(category)) {
          category_obj.params =
            j(data[0], CAROUSEL_TITLE).navigationEndpoint.browseEndpoint.params;
        }
      }

      category_obj.results = parse_content_list(
        data[0].contents,
        category_parser,
        category_key,
      );

      categories[category] = category_obj as any;
    }
  }

  return categories;
}

export function parse_artist_contents(results: any[]) {
  const categories_data = {
    albums: [_("albums"), parse_album],
    singles: [_("singles"), parse_single],
    videos: [_("videos"), parse_video],
    playlists: [_("playlists"), parse_playlist],
    related: [_("related"), parse_related_artist],
    featured: [_("featured"), parse_featured],
    library: [_("library"), parse_mixed_item],
  } satisfies CategoryMap;

  return parse_categories(results, categories_data);
}

export type ArtistContents = ReturnType<typeof parse_artist_contents>;

export function parse_explore_contents(results: any[]) {
  const categories_data = {
    albums: [_("new albums"), parse_album],
    songs: [_("top songs"), parse_top_song, MRLIR],
    moods: [
      _("moods"),
      parse_mood_or_genre,
      "musicNavigationButtonRenderer",
    ],
    trending: [_("trending"), parse_trending, MRLIR],
  } satisfies CategoryMap;

  return parse_categories(results, categories_data);
}

export type ExploreContents = ReturnType<typeof parse_explore_contents>;

export function parse_chart_contents(results: any[]) {
  const categories_data = {
    // In exceedingly rare cases, songs may contain both songs and videos
    songs: [_("top songs"), parse_trending, MRLIR],
    videos: [_("top videos"), parse_top_video],
    genres: [_("genres"), parse_playlist],
    artists: [_("top artists"), parse_top_artist, MRLIR],
    trending: [_("trending"), parse_trending, MRLIR],
  } satisfies CategoryMap;

  return parse_categories(results, categories_data);
}

export type ChartContents = ReturnType<typeof parse_chart_contents>;

export function parse_content_list<T extends any>(
  results: any,
  parse_func: (data: any) => T,
  key = MTRIR,
) {
  const contents: T[] = [];

  for (const result of results) {
    contents.push(parse_func(result[key as any]));
  }

  return contents;
}

export interface ParsedMoodOrGenre {
  title: string;
  color: string;
  params: string;
}

export function parse_mood_or_genre(result: any[]): ParsedMoodOrGenre {
  return {
    title: j(result, "buttonText.runs[0].text"),
    color: color_to_hex(j(result, "solid.leftStripeColor")),
    params: j(result, "clickCommand.browseEndpoint.params"),
  };
}

export type AlbumType = "album" | "single" | "ep";

export interface ParsedAlbum {
  title: string;
  year: string | null;
  browseId: string;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  album_type: AlbumType;
  artists: ArtistRun[];
}

export function parse_album(result: any): ParsedAlbum {
  const SUBTITLE_RUNS = "subtitle.runs";

  const subtitles = j(result, SUBTITLE_RUNS);

  const runs = parse_song_artists_runs(subtitles.slice(2));

  const year = subtitles[subtitles.length - 1].text;

  const is_year = year.match(/^\d{4}$/);

  if (is_year) {
    runs.pop();
  }

  return {
    title: j(result, TITLE_TEXT),
    year: is_year ? year : null,
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    album_type: j(result, SUBTITLE).toString().toLowerCase(),
    artists: runs,
  };
}

export interface ParsedSingle {
  title: string;
  year: string | null;
  browseId: string;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  artists: ArtistRun[];
}

export function parse_single(result: any): ParsedSingle {
  const SUBTITLE_RUNS = "subtitle.runs";

  const subtitles = j(result, SUBTITLE_RUNS);

  const runs = parse_song_artists_runs(subtitles.slice(2));

  const year = subtitles[subtitles.length - 1].text;

  const is_year = year.match(/^\d{4}$/);

  if (is_year) {
    runs.pop();
  }

  return {
    title: j(result, TITLE_TEXT),
    year: is_year ? year : null,
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    artists: runs,
  };
}

export interface ParsedSong extends SongRuns {
  title: string;
  videoId: string | null;
  playlistId: string | null;
  thumbnails: Thumbnail[];
}

export function parse_song(result: any): ParsedSong {
  return {
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    ...parse_song_runs(result.subtitle.runs),
  };
}

export interface FlatSong {
  title: string;
  videoId: string | null;
  artists: SongArtist[] | null;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  album: {
    name: string;
    id: string;
  } | null;
  views: string | null;
}

export function parse_song_flat(data: any) {
  const columns = [];
  for (let i = 0; i < data.flexColumns.length; i++) {
    columns.push(get_flex_column_item(data, i));
  }

  const song: FlatSong = {
    title: j(columns[0], TEXT_RUN_TEXT),
    videoId: jo(columns[0], TEXT_RUN, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(data, 1),
    thumbnails: j(data, THUMBNAILS),
    isExplicit: jo(data, BADGE_LABEL) != null,
    album: null,
    views: null,
  };

  if (
    columns.length > 2 && columns[2] != null &&
    "navigationEndpoint" in j(columns[2], TEXT_RUN)
  ) {
    song.album = {
      name: j(columns[2], TEXT_RUN_TEXT),
      id: j(columns[2], TEXT_RUN, NAVIGATION_BROWSE_ID),
    };
  } else {
    song.views = jo(columns[1], `text.runs[-1].text`)?.split(" ")[0];
  }

  return song;
}

export interface ParsedVideo {
  title: string;
  videoId: string;
  artists: SongArtist[] | null;
  playlistId: string | null;
  thumbnails: Thumbnail[];
  views: string | null;
}

export function parse_video(result: any): ParsedVideo {
  const runs = result.subtitle.runs;
  const artists_len = get_dot_separator_index(runs);

  return {
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists_runs(runs.slice(0, artists_len)),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    views: runs[runs.length - 1].text.split(" ")[0],
  };
}

type TrendChange = "up" | "down" | "new";

export interface TopSong {
  title: string;
  videoId: string;
  artists: SongArtist[] | null;
  playlistId: string | null;
  thumbnails: Thumbnail[];
  rank: number;
  change: TrendChange | null;
  album: {
    title: string;
    browseId: string;
  } | null;
}

export function parse_top_song(result: any): TopSong {
  const title = get_flex_column_item(result, 0);
  const title_run = j(title, TEXT_RUN);

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  const album_run = jo(
    get_flex_column_item(result, result.flexColumns.length - 1) ?? {},
    TEXT_RUN,
  );

  return {
    title: j(title_run, "text"),
    videoId: j(title_run, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(result, 1),
    playlistId: jo(title_run, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    rank: Number(j(rank, TEXT_RUN_TEXT)),
    change: jo(rank, "icon.iconType")?.split("_")[2].toLowerCase() || null,
    album: album_run
      ? {
        title: j(album_run, "text"),
        browseId: j(album_run, NAVIGATION_BROWSE_ID),
      }
      : null,
  };
}

export interface TopVideo {
  title: string;
  videoId: string;
  artists: SongArtist[] | null;
  playlistId: string | null;
  thumbnails: Thumbnail[];
  views: string | null;
  rank: number;
  change: TrendChange | null;
}

export function parse_top_video(result: any): TopVideo {
  const runs = result.subtitle.runs;
  const artists_len = get_dot_separator_index(runs);

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  return {
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists_runs(runs.slice(0, artists_len)),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    views: runs[runs.length - 1].text.split(" ")[0],
    rank: Number(j(rank, TEXT_RUN_TEXT)),
    change: jo(rank, "icon.iconType")?.split("_")[2].toLowerCase() || null,
  };
}

export interface TopArtist {
  name: string;
  browseId: string;
  subscribers: string;
  thumbnails: Thumbnail[];
  rank: number;
  change: TrendChange | null;
}

export function parse_top_artist(result: any): TopArtist {
  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  return {
    name: j(get_flex_column_item(result, 0), TEXT_RUN_TEXT),
    browseId: j(result, NAVIGATION_BROWSE_ID),
    subscribers:
      j(get_flex_column_item(result, 1), TEXT_RUN_TEXT)?.split(" ")[0],
    thumbnails: j(result, THUMBNAILS),
    rank: Number(j(rank, TEXT_RUN_TEXT)),
    change: jo(rank, "icon.iconType")?.split("_")[2].toLowerCase() || null,
  };
}

export interface TrendingSong {
  title: string;
  videoId: string | null;
  artists: SongArtist[] | null;
  playlistId: string | null;
  thumbnails: Thumbnail[];
  rank: number;
  change: TrendChange | null;
  album: {
    title: string;
    browseId: string;
  } | null;
  views: string | null;
}

export function parse_trending(result: any): TrendingSong {
  const title = get_flex_column_item(result, 0);
  const title_run = j(title, TEXT_RUN);

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  const last_flex =
    get_flex_column_item(result, result.flexColumns.length - 1) ??
      get_flex_column_item(result, result.flexColumns.length - 2);

  // if (!("runs" in last_flex.title.text)) {
  //   last_flex = get_flex_column_item(result, result.flexColumns.length - 2);
  // }

  const last_runs = jo(
    last_flex,
    TEXT_RUNS,
  );

  const views = last_runs[last_runs.length - 1];

  const has_views = views?.text.endsWith(_("views")) ?? false;

  const album_flex = get_flex_column_item(
    result,
    result.flexColumns.length - 1,
  );

  return {
    title: j(title_run, "text"),
    videoId: jo(title_run, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(result, 1, has_views ? -1 : undefined),
    playlistId: jo(title_run, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    rank: Number(j(rank, TEXT_RUN_TEXT)),
    change: jo(rank, "icon.iconType")?.split("_")[2].toLowerCase() || null,
    album: (!has_views && album_flex)
      ? {
        title: j(album_flex, TEXT_RUN_TEXT),
        browseId: j(album_flex, TEXT_RUN, NAVIGATION_BROWSE_ID),
      }
      : null,
    views: has_views ? views.text.split(" ")[0] : null,
  };
}

export interface ParsedPlaylist {
  title: string;
  playlistId: string;
  thumbnails: Thumbnail[];
  songs: string | null;
  authors: ArtistRun[] | null;
  description: string | null;
  count: string | null;
  author: ArtistRun[] | null;
}

export function parse_playlist(data: any) {
  const subtitles = j(data, "subtitle.runs");

  const has_data = subtitles[0]?.text.toLowerCase() === _("playlist");
  const has_songs = subtitles.length > 3;

  const playlist: ParsedPlaylist = {
    title: j(data, TITLE_TEXT),
    playlistId: j(data, TITLE, NAVIGATION_BROWSE_ID).slice(2),
    thumbnails: j(data, THUMBNAIL_RENDERER),
    songs: has_data && has_songs
      ? j(subtitles[subtitles.length - 1], "text")?.split(" ")[0]
      : null,
    authors: has_data
      ? parse_song_artists_runs(
        subtitles.slice(2, has_songs ? -1 : undefined),
      )
      : null,
    description: null,
    count: null,
    author: null,
  };

  const subtitle = data.subtitle;

  if ("runs" in subtitle) {
    playlist.description = subtitle.runs.map((run: any) => run.text).join("");

    if (
      subtitle.runs.length == 3 &&
      j(data, SUBTITLE2).match(/\d+ /)
    ) {
      playlist.count = j(data, SUBTITLE2).split(" ")[0];
      // TODO: why are we getting "author" 2 times?
      playlist.author = parse_song_artists_runs(subtitle.runs.slice(0, 1));
    }
  }

  return playlist;
}

export interface RelatedArtist {
  name: string;
  browseId: string;
  subscribers: string | null;
  thumbnails: Thumbnail[];
}

export function parse_related_artist(data: any): RelatedArtist {
  const subscribers = jo(data, SUBTITLE2)?.split(" ")[0];

  return {
    name: j(data, TITLE_TEXT),
    browseId: j(data, TITLE, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

export interface WatchPlaylist {
  title: string;
  playlistId: string;
  thumbnails: Thumbnail[];
}

export function parse_watch_playlist(data: any): WatchPlaylist {
  return {
    title: j(data, TITLE_TEXT),
    playlistId: j(data, NAVIGATION_WATCH_PLAYLIST_ID),
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

export interface FeaturedPlaylist {
  title: string;
  playlistId: string;
  thumbnails: Thumbnail[];
  author: {
    name: string;
    id: string | null;
  };
}

export function parse_featured(data: any): FeaturedPlaylist {
  return {
    title: j(data, TITLE_TEXT),
    playlistId: jo(data, NAVIGATION_BROWSE_ID).slice(2),
    thumbnails: j(data, THUMBNAIL_RENDERER),
    author: {
      name: j(data, SUBTITLE2),
      id: jo(data, "subtitle.runs[2]", NAVIGATION_BROWSE_ID),
    },
  };
}

type Translatable = keyof typeof STRINGS[keyof typeof STRINGS];

export function _(id: Translatable) {
  const result = STRINGS[get_option("language") as keyof typeof STRINGS];

  return result[id] ?? id;
}
