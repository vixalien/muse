import STRINGS from "../locales/strings.json" assert { type: "json" };

import {
  BADGE_LABEL,
  CAROUSEL,
  CAROUSEL_SUBTITLE,
  CAROUSEL_THUMBNAILS,
  CAROUSEL_TITLE,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  MRLIR,
  MTRIR,
  NAVIGATION_BROWSE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PAGE_TYPE,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
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
} from "../nav.ts";
import { get_option } from "../setup.ts";
import { j, jo } from "../util.ts";
import {
  ArtistRun,
  parse_song_artists,
  parse_song_artists_runs,
  parse_song_runs,
  SongArtist,
  SongRuns,
} from "./songs.ts";
import {
  color_to_hex,
  get_dot_separator_index,
  get_flex_column_item,
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
  | WatchPlaylist
  | ParsedSong
  | ParsedVideo
  | ParsedAlbum
  | RelatedArtist
  | FlatSong
  | ParsedPlaylist
  | null;

export function parse_mixed_item(data: any) {
  let item: MixedItem = null;

  const page_type = jo(data, TITLE, NAVIGATION_PAGE_TYPE);
  switch (page_type) {
    case null:
    case undefined:
      // song or watch playlist
      if (jo(data, NAVIGATION_WATCH_PLAYLIST_ID) != null) {
        item = parse_watch_playlist(data);
      } else {
        const content = parse_song(data);
        if (content.views != null) {
          item = {
            ...content,
            type: "inline-video",
          };
        } else {
          item = {
            ...content,
            type: "song",
          };
        }
      }
      break;
    case "MUSIC_PAGE_TYPE_ALBUM":
      item = parse_album(data);
      break;
    case "MUSIC_PAGE_TYPE_USER_CHANNEL":
    case "MUSIC_PAGE_TYPE_ARTIST":
      item = {
        ...parse_related_artist(data),
        type: page_type === "MUSIC_PAGE_TYPE_USER_CHANNEL"
          ? "channel"
          : "artist",
      };
      break;
    case "MUSIC_PAGE_TYPE_PLAYLIST":
      item = parse_playlist(data);
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
  display: "list" | null;
}

export function parse_mixed_content(rows: any[]) {
  const items: MixedContent[] = [];

  for (const row of rows) {
    let title = null,
      contents,
      browseId = null,
      subtitle = null,
      thumbnails = null,
      display: MixedContent["display"] = null;

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
          display = "list";

          item = parse_song_flat(data);
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
      display,
    });
  }

  return items;
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
        j(r, `${CAROUSEL}.${CAROUSEL_TITLE}`).text == category_local
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
          CAROUSEL_TITLE,
          NAVIGATION_BROWSE_ID,
        );

        category_obj.params = jo(
          data[0],
          CAROUSEL_TITLE,
          NAVIGATION_BROWSE,
          "params",
        );
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

export function parse_channel_contents(results: any[]) {
  const categories_data = {
    artists_on_repeat: [_("artists_on_repeat"), parse_related_artist],
    playlists_on_repeat: [_("playlists_on_repeat"), parse_playlist],
    videos: [_("videos"), parse_video],
    playlists: [_("playlists"), parse_playlist],
  } satisfies CategoryMap;

  return parse_categories(results, categories_data);
}

export type NonNUllableChannelContents = ReturnType<
  typeof parse_channel_contents
>;

export type ChannelContents = {
  [Key in keyof NonNUllableChannelContents]:
    | NonNUllableChannelContents[Key]
    | null;
};

export function parse_artist_contents(results: any[]) {
  const categories_data = {
    albums: [_("albums"), parse_album],
    singles: [_("singles"), parse_single],
    videos: [_("videos"), parse_video],
    playlists: [_("playlists"), parse_playlist],
    related: [_("related"), parse_related_artist],
    featured: [_("featured"), parse_playlist],
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
  parse_func: (data: any) => T | null,
  key = MTRIR,
) {
  const contents: T[] = [];

  for (const result of results) {
    const list = result?.[key as any];

    if (!list) continue;

    const data = parse_func(list);

    if (data) {
      contents.push(data);
    }
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
  type: "album";
  title: string;
  year: string | null;
  browseId: string;
  audioPlaylistId: string;
  thumbnails: Thumbnail[];
  isExplicit: boolean;
  album_type: AlbumType | null;
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

  const playlistId = jo(
    result,
    "thumbnailOverlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint",
  )?.playlistId ?? j(
    result,
    "thumbnailOverlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchPlaylistEndpoint",
  ).playlistId;

  return {
    type: "album",
    title: j(result, TITLE_TEXT),
    year: is_year ? year : null,
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    audioPlaylistId: playlistId,
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    album_type: j(result, SUBTITLE),
    artists: runs,
  };
}

export function parse_single(result: any): ParsedAlbum {
  const SUBTITLE_RUNS = "subtitle.runs";

  const subtitles = j(result, SUBTITLE_RUNS);

  const runs = parse_song_artists_runs(subtitles.slice(2));

  const year = subtitles[subtitles.length - 1].text;

  const is_year = year.match(/^\d{4}$/);

  if (is_year) {
    runs.pop();
  }

  const playlistId = jo(
    result,
    "thumbnailOverlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint",
  )?.playlistId ?? j(
    result,
    "thumbnailOverlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchPlaylistEndpoint",
  ).playlistId;

  return {
    type: "album",
    title: j(result, TITLE_TEXT),
    year: is_year ? year : null,
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    audioPlaylistId: playlistId,
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    artists: runs,
    album_type: null,
  };
}

export interface ParsedSong extends SongRuns {
  type: "inline-video" | "song";
  title: string;
  videoId: string;
  playlistId: string | null;
  isExplicit: boolean;
  thumbnails: Thumbnail[];
}

export function parse_song(result: any): ParsedSong {
  return {
    type: "song",
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: jo(result, SUBTITLE_BADGE_LABEL) != null,
    ...parse_song_runs(result.subtitle.runs),
  };
}

export interface FlatSong {
  type: "flat-song";
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
    type: "flat-song",
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
    song.views = jo(columns[1], `text.runs[-1].text`);
  }

  return song;
}

export interface ParsedVideo {
  type: "video";
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
    type: "video",
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists_runs(runs.slice(0, artists_len)),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    views: runs[runs.length - 1].text,
  };
}

export type TrendChange = "UP" | "DOWN" /* | "NEW" */ | "NEUTRAL";

export function parse_top_song(result: any): Ranked<ParsedSong> {
  const title = get_flex_column_item(result, 0);
  const title_run = j(title, TEXT_RUN);

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  const album_run = jo(
    get_flex_column_item(result, result.flexColumns.length - 1) ?? {},
    TEXT_RUN,
  );

  return {
    type: "song",
    title: j(title_run, "text"),
    videoId: j(title_run, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(result, 1) ?? [],
    playlistId: jo(title_run, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    rank: j(rank, TEXT_RUN_TEXT),
    change: jo(rank, "icon.iconType")?.split("_")[2] || null,
    isExplicit: jo(result, BADGE_LABEL) != null,
    views: null,
    duration: null,
    duration_seconds: null,
    year: null,
    album: album_run
      ? {
        name: j(album_run, "text"),
        id: j(album_run, NAVIGATION_BROWSE_ID),
      }
      : null,
  };
}

export function parse_top_video(result: any): Ranked<ParsedVideo> {
  const runs = result.subtitle.runs;
  const artists_len = get_dot_separator_index(runs);

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  return {
    type: "video",
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists_runs(runs.slice(0, artists_len)),
    playlistId: jo(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    views: runs[runs.length - 1].text,
    rank: j(rank, TEXT_RUN_TEXT),
    change: jo(rank, "icon.iconType")?.split("_")[2] || null,
  };
}

export function parse_top_artist(result: any): Ranked<RelatedArtist> {
  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  return {
    type: "artist",
    name: j(get_flex_column_item(result, 0), TEXT_RUN_TEXT),
    browseId: j(result, NAVIGATION_BROWSE_ID),
    subscribers: j(get_flex_column_item(result, 1), TEXT_RUN_TEXT),
    thumbnails: j(result, THUMBNAILS),
    rank: j(rank, TEXT_RUN_TEXT),
    change: jo(rank, "icon.iconType")?.split("_")[2] || null,
  };
}

export function parse_trending(
  result: any,
): Ranked<ParsedSong> | Ranked<ParsedVideo> {
  const title = get_flex_column_item(result, 0);
  const title_run = j(title, TEXT_RUN);

  const last_flex =
    get_flex_column_item(result, result.flexColumns.length - 1) ??
      get_flex_column_item(result, result.flexColumns.length - 2);

  const last_runs = jo(
    last_flex,
    TEXT_RUNS,
  );

  const rank = j(result, "customIndexColumn.musicCustomIndexColumnRenderer");

  const album_flex = get_flex_column_item(
    result,
    result.flexColumns.length - 1,
  );

  const data: Omit<Ranked<ParsedSong>, "type" | "album"> = {
    title: j(title_run, "text"),
    videoId: j(title_run, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(result, 1, album_flex ? undefined : -1) ?? [],
    playlistId: jo(title_run, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAILS),
    rank: j(rank, TEXT_RUN_TEXT),
    change: jo(rank, "icon.iconType")?.split("_")[2] || null,
    year: null,
    duration: null,
    duration_seconds: null,
    isExplicit: jo(result, BADGE_LABEL) != null,
    views: null,
  };

  if (album_flex) {
    return {
      type: "song",
      ...data,
      album: album_flex
        ? {
          name: j(album_flex, TEXT_RUN_TEXT),
          id: j(album_flex, TEXT_RUN, NAVIGATION_BROWSE_ID),
        }
        : null,
    };
  } else {
    return {
      type: "video",
      ...data,
      views: last_runs[last_runs.length - 1]?.text ?? null,
    };
  }
}

export interface ParsedPlaylist {
  type: "playlist";
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

  const has_data = subtitles[0]?.text === _("playlist");
  const has_songs = subtitles.length > 3;

  const playlist: ParsedPlaylist = {
    type: "playlist",
    title: j(data, TITLE_TEXT),
    playlistId: j(data, TITLE, NAVIGATION_BROWSE_ID).slice(2),
    thumbnails: j(data, THUMBNAIL_RENDERER),
    songs: has_data && has_songs
      ? j(subtitles[subtitles.length - 1], "text")
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
      playlist.count = j(data, SUBTITLE2);
      // TODO: why are we getting "author" 2 times?
      playlist.author = parse_song_artists_runs(subtitle.runs.slice(0, 1));
    }
  }

  return playlist;
}

export interface RelatedArtist {
  type: "artist" | "channel";
  name: string;
  browseId: string;
  subscribers: string | null;
  thumbnails: Thumbnail[];
}

export type Ranked<T> = T & {
  rank: string;
  change: TrendChange | null;
};

export function parse_related_artist(data: any): RelatedArtist {
  const subscribers = jo(data, SUBTITLE2);

  return {
    type: "artist",
    name: j(data, TITLE_TEXT),
    browseId: j(data, TITLE, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

export interface WatchPlaylist {
  type: "watch-playlist";
  title: string;
  playlistId: string;
  thumbnails: Thumbnail[];
}

export function parse_watch_playlist(data: any): WatchPlaylist {
  return {
    type: "watch-playlist",
    title: j(data, TITLE_TEXT),
    playlistId: j(data, NAVIGATION_WATCH_PLAYLIST_ID),
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

type Translatable = keyof typeof STRINGS[keyof typeof STRINGS];

export function _(id: Translatable) {
  const result = STRINGS[get_option("language") as keyof typeof STRINGS];

  return result[id] ?? id;
}

export function __(value: string) {
  // does the reverse of _()
  // it returns the key of the string or null if it doesn't exist

  const result = STRINGS[get_option("language") as keyof typeof STRINGS];

  for (const key in result) {
    if (result[key as Translatable] === value) {
      return key as Translatable;
    }
  }

  return null;
}

export function is_ranked<T>(
  item: T | Ranked<T>,
): item is Ranked<T> {
  return typeof (item as any).rank === "string";
}
