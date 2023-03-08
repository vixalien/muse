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
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
  PAGE_TYPE,
  RUN_TEXT,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_BADGE_LABEL,
  TEXT_RUN,
  TEXT_RUN_TEXT,
  THUMBNAIL_RENDERER,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { j } from "../util.ts";
import {
  parse_song_artists,
  parse_song_artists_runs,
  parse_song_runs,
} from "./songs.ts";
import { get_dot_separator_index, get_flex_column_item } from "./util.ts";

export function parse_moods(results: any[]) {
  const moods: { name: string; params: string }[] = [];

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

export function parse_mixed_item(data: any) {
  let type: string | null = null, content: any;

  const page_type = j(data, TITLE, NAVIGATION_BROWSE, PAGE_TYPE);
  switch (page_type) {
    case null:
    case undefined:
      // song or watch playlist
      if (j(data, NAVIGATION_WATCH_PLAYLIST_ID) != null) {
        type = "watch-playlist";
        content = parse_watch_playlist(data);
      } else {
        content = parse_song(data);
        type = content.views != null ? "video" : "song";
      }
      break;
    case "MUSIC_PAGE_TYPE_ALBUM":
      type = "album";
      content = parse_album(data);
      break;
    case "MUSIC_PAGE_TYPE_USER_CHANNEL":
    case "MUSIC_PAGE_TYPE_ARTIST":
      type = "artist";
      content = parse_related_artist(data);
      break;
    case "MUSIC_PAGE_TYPE_PLAYLIST":
      type = "playlist";
      content = parse_playlist(data);
      break;
    default:
      console.error("Unknown page type", page_type);
  }

  return type ? { type, content } : null;
}

export function parse_mixed_content(rows: any[]) {
  const items = [];

  for (const row of rows) {
    let title, contents, browseId = null, subtitle = null, thumbnails = null;

    if (DESCRIPTION_SHELF in row) {
      const results = j(row, DESCRIPTION_SHELF);
      // type = "description";
      title = j(results, "header", RUN_TEXT);
      contents = j(results, DESCRIPTION);
    } else {
      const results = Object.values(row)[0] as any;
      if (!("contents" in results)) {
        continue;
      }
      const carousel_title = j(results, CAROUSEL_TITLE);

      title = j(carousel_title, "text");
      browseId = j(carousel_title, NAVIGATION_BROWSE_ID);
      subtitle = j(results, CAROUSEL_SUBTITLE, "text");
      thumbnails = j(results, CAROUSEL_THUMBNAILS);

      contents = [];
      for (const result of results["contents"]) {
        const data = j(result, MTRIR);
        let content = null, type;

        if (data != null) {
          const item = parse_mixed_item(data);
          if (item != null) {
            type = item.type;
            content = item.content;
          }
        } else {
          type = "song";
          const data = j(result, MRLIR);
          content = parse_song_flat(data);
        }

        contents.push({ type, ...content });
      }

      items.push({
        title,
        subtitle,
        thumbnails,
        browseId,
        contents,
      });
    }
  }

  return items;
}

export function parse_artist_contents(results: any[]) {
  const categories = [
    "albums",
    "singles",
    "videos",
    "playlists",
    "related",
    "featured",
  ];
  const categories_local = [
    _("albums"),
    _("singles"),
    _("videos"),
    _("playlists"),
    _("related"),
    _("featured"),
  ];
  const categories_parser = [
    parse_album,
    parse_single,
    parse_video,
    parse_playlist,
    parse_related_artist,
    parse_featured,
  ];

  const artist: any = {};

  for (const i in categories) {
    const category = categories[i];

    const data = results
      .filter((r) =>
        "musicCarouselShelfRenderer" in r &&
        j(r, `${CAROUSEL}.${CAROUSEL_TITLE}`).text.toLowerCase() ==
          categories_local[i]
      )
      .map((r) => r.musicCarouselShelfRenderer);

    if (data.length > 0) {
      artist[category] = { browseId: null, results: [] };

      if ("navigationEndpoint" in j(data[0], CAROUSEL_TITLE)) {
        artist[category].browseId = j(
          data[0],
          `${CAROUSEL_TITLE}.${NAVIGATION_BROWSE_ID}`,
        );

        if (["albumns", "singles", "playlists"].includes(category)) {
          artist[category].params =
            j(data[0], CAROUSEL_TITLE).navigationEndpoint.browseEndpoint.params;
        }
      }

      artist[category].results = parse_content_list(
        data[0].contents,
        categories_parser[i],
      );
    }
  }

  return artist;
}

export function parse_content_list(
  results: any,
  parse_func: (data: any) => any,
  key = MTRIR,
) {
  const contents = [];

  for (const result of results) {
    contents.push(parse_func(result[key as any]));
  }

  return contents;
}

export function parse_album(result: any) {
  const SUBTITLE_RUNS = "subtitle.runs";

  const subtitles = j(result, SUBTITLE_RUNS);

  return {
    title: j(result, TITLE_TEXT),
    year: j(subtitles[subtitles.length - 1], "text"),
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    isExplicit: j(result, SUBTITLE_BADGE_LABEL) != null,
    type: j(result, SUBTITLE),
    artists: parse_song_artists_runs(subtitles.slice(2, -1)),
  };
}

export function parse_single(result: any) {
  return {
    title: j(result, TITLE_TEXT),
    year: j(result, SUBTITLE),
    browseId: j(result, TITLE, NAVIGATION_BROWSE_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
  };
}

export function parse_song(result: any) {
  return {
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    playlistId: j(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    ...parse_song_runs(result.subtitle.runs),
  };
}

export function parse_song_flat(data: any) {
  const columns = [];
  for (let i = 0; i < data.flexColumns.length; i++) {
    columns.push(get_flex_column_item(data, i));
  }

  const song: any = {
    title: j(columns[0], TEXT_RUN_TEXT),
    videoId: j(columns[0], TEXT_RUN, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists(data, 1),
    thumbnails: j(data, THUMBNAILS),
    isExplicit: j(data, BADGE_LABEL) != null,
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
    song.views = j(columns[1], `text.runs[-1].text`).split(" ")[0];
  }

  return song;
}

export function parse_video(result: any) {
  const runs = result.subtitle.runs;
  const artists_len = get_dot_separator_index(runs);

  return {
    title: j(result, TITLE_TEXT),
    videoId: j(result, NAVIGATION_VIDEO_ID),
    artists: parse_song_artists_runs(runs.slice(0, artists_len)),
    playlistId: j(result, NAVIGATION_PLAYLIST_ID),
    thumbnails: j(result, THUMBNAIL_RENDERER),
    views: runs[runs.length - 1].text.split(" ")[0],
  };
}

export function parse_playlist(data: any) {
  const subtitles = j(data, "subtitle.runs");

  const has_data = subtitles[0]?.text.toLowerCase() === _("playlist");
  const has_songs = subtitles.length > 3;

  const playlist: any = {
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
  };

  const subtitle = data.subtitle;

  if ("runs" in subtitle) {
    playlist.description = subtitle.runs.map((run: any) => run.text).join("");

    if (
      subtitle.runs.length == 3 &&
      j(data, SUBTITLE2).match(/\d+ /)
    ) {
      playlist.count = j(data, SUBTITLE2).split(" ")[0];
      playlist.author = parse_song_artists_runs(subtitle.runs.slice(0, 1));
    }
  }

  return playlist;
}

export function parse_related_artist(data: any) {
  const subscribers = j(data, SUBTITLE2)?.split(" ")[0];

  return {
    title: j(data, TITLE_TEXT),
    browseId: j(data, TITLE, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

export function parse_watch_playlist(data: any) {
  return {
    title: j(data, TITLE_TEXT),
    playlistId: j(data, NAVIGATION_WATCH_PLAYLIST_ID),
    thumbnails: j(data, THUMBNAIL_RENDERER),
  };
}

export function parse_featured(data: any) {
  return {
    title: j(data, TITLE_TEXT),
    playlistId: j(data, NAVIGATION_BROWSE_ID).slice(2),
    thumbnails: j(data, THUMBNAIL_RENDERER),
    author: j(data, SUBTITLE2),
  };
}

export function _(id: string) {
  switch (id) {
    case "related":
      return "fans might also like";
    case "featured":
      return "featured on";
    default:
      return id;
  }
}
