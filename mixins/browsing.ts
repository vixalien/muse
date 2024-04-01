import CONSTANTS2 from "../constants-ng.json" assert { type: "json" };

import { get_continuations, get_sort_continuations } from "../continuations.ts";
import {
  CAROUSEL,
  CONTENT,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  find_object_by_key,
  GRID,
  GRID_ITEMS,
  MRLIR,
  MRLITFC,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  RUN_TEXT,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  TEXT_RUN_TEXT,
  THUMBNAIL,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { AlbumHeader, parse_album_header } from "../parsers/albums.ts";
import {
  ArtistContents,
  ChannelContents,
  find_context_param,
  MixedContent,
  Mood,
  parse_album,
  parse_artist_contents,
  parse_channel_contents,
  parse_content_list,
  parse_mixed_content,
  parse_moods,
  parse_playlist,
  ParsedAlbum,
  ParsedPlaylist,
} from "../parsers/browsing.ts";
import {
  parse_playlist_items,
  PlaylistItem,
  VideoType,
} from "../parsers/playlists.ts";
import { ArtistRun, Format, parse_format } from "../parsers/songs.ts";
import { j, jo, sum_total_duration } from "../util.ts";
import { Thumbnail } from "./playlist.ts";
import {
  AbortOptions,
  get_sort_options,
  PaginationOptions,
  SortOptions,
} from "./utils.ts";
import { request_json } from "./_request.ts";

export { is_ranked } from "../parsers/browsing.ts";

export type {
  Category,
  ExploreContents,
  FlatSong,
  MixedContent,
  MixedItem,
  Mood,
  ParsedAlbum,
  ParsedMoodOrGenre,
  ParsedPlaylist,
  ParsedSong,
  ParsedVideo,
  Ranked,
  RelatedArtist,
  WatchPlaylist,
} from "../parsers/browsing.ts";

export type {
  AudioFormat,
  Format,
  LikeStatus,
  VideoFormat,
} from "../parsers/songs.ts";

export type { ArtistRun, Thumbnail };

export interface Home {
  continuation: string | null;
  moods: Mood[];
  thumbnails: Thumbnail[];
  results: MixedContent[];
}

export interface HomeOptions extends PaginationOptions {
  params?: string;
}

// TODO: get home thumbnails
export async function get_home(
  options: HomeOptions = {},
): Promise<Home> {
  const { params, limit = 3, continuation, signal } = options;

  const endpoint = "browse";
  const data: Record<string, any> = { browseId: "FEmusic_home" };

  if (params) {
    data.params = params;
  }

  const home: Home = {
    continuation: null,
    results: [],
    moods: [],
    thumbnails: [],
  };

  let section_list;

  if (continuation) {
    home.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data, signal });

    const tab = j(json, SINGLE_COLUMN_TAB);

    const results = j(tab, SECTION_LIST);

    section_list = j(tab, "sectionListRenderer");

    home.moods.push(...parse_moods(tab));

    home.continuation = j(
      section_list,
      "continuations[0].nextContinuationData.continuation",
    );

    home.results = parse_mixed_content(results);

    home.thumbnails = j(
      json,
      "background",
      "musicThumbnailRenderer",
      THUMBNAIL,
    );
  }

  if (home.continuation) {
    const continued_data = await get_continuations(
      home.continuation,
      "sectionListContinuation",
      limit - home.results.length,
      (params) => {
        return request_json(endpoint, {
          data,
          params,
          signal,
        });
      },
      (contents) => {
        return parse_mixed_content(contents);
      },
    );

    home.continuation = continued_data.continuation;
    home.results.push(...continued_data.items);
  }

  return home;
}

export interface Artist extends ArtistContents {
  views: string | null;
  description: string | null;
  name: string;
  channelId: string;
  shuffleId: string | null;
  radioId: string | null;
  subscribers: string | null;
  subscribed: boolean;
  thumbnails: Thumbnail[];
  songs: {
    browseId: string | null;
    results: PlaylistItem[];
  };
}

export async function get_artist(
  artistId: string,
  options: AbortOptions = {},
): Promise<Artist> {
  if (artistId.startsWith("MPLA")) artistId = artistId.slice(4);

  const json = await request_json("browse", {
    data: {
      browseId: artistId,
    },
    signal: options.signal,
  });

  const results = j(json, `${SINGLE_COLUMN_TAB}.${SECTION_LIST}`);
  const header = j(json, "header.musicImmersiveHeaderRenderer");
  const subscription_button = j(
    header,
    "subscriptionButton.subscribeButtonRenderer",
  );

  const artist: Artist = {
    views: null,
    description: null,
    name: j(header, TITLE_TEXT),
    channelId: j(subscription_button, "channelId"),
    shuffleId: jo(
      header,
      `playButton.buttonRenderer.${NAVIGATION_PLAYLIST_ID}`,
    ),
    radioId: jo(
      header,
      `startRadioButton.buttonRenderer.${NAVIGATION_PLAYLIST_ID}`,
    ),
    subscribers: jo(subscription_button, "subscriberCountText.runs[0].text"),
    subscribed: subscription_button.subscribed,
    thumbnails: jo(header, THUMBNAILS),
    songs: { browseId: null, results: [] as any[] },
    ...parse_artist_contents(results),
  };

  const descriptionShelf = find_object_by_key(
    results,
    DESCRIPTION_SHELF,
    undefined,
    true,
  );

  if (descriptionShelf) {
    artist.description = j(descriptionShelf, DESCRIPTION);
    artist.views = !("subheader" in descriptionShelf)
      ? null
      : j(descriptionShelf, `subheader.runs[0].text`);
  }

  // API sometimes doesn't return the songs
  if ("musicShelfRenderer" in results[0]) {
    const musicShelf = j(results[0], `${MUSIC_SHELF}`);
    if ("navigationEndpoint" in j(musicShelf, TITLE)) {
      artist.songs.browseId = j(
        musicShelf,
        `${TITLE}.${NAVIGATION_BROWSE_ID}`,
      );
    }
    artist.songs.results = parse_playlist_items(musicShelf.contents);
  }

  return artist;
}

export interface AlbumResult extends AlbumHeader {
  id: string;
  tracks: PlaylistItem[];
  other_versions: ParsedAlbum[] | null;
}

export async function get_album(
  browseId: string,
  options: AbortOptions = {},
): Promise<AlbumResult> {
  const response = await request_json("browse", {
    data: {
      browseId,
    },
    signal: options.signal,
  });

  const results = j(
    response,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    MUSIC_SHELF,
  );

  const carousel = jo(
    response,
    SINGLE_COLUMN_TAB,
    SECTION_LIST,
    "1",
    CAROUSEL,
  );

  const header = parse_album_header(response);

  const album: AlbumResult = {
    id: find_context_param(response, "browse_id"),
    ...header,
    tracks: parse_playlist_items(results.contents),
    other_versions: null,
  };

  if (carousel != null) {
    album.other_versions = parse_content_list(carousel.contents, parse_album);
  }

  album.duration_seconds = sum_total_duration(album);

  return album;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  lengthSeconds: number;
  channelId: string;
  isOwnerViewing: boolean;
  isCrawlable: boolean;
  thumbnail: { thumbnails: Thumbnail[] };
  allowRatings: true;
  viewCount: number;
  author: string;
  isPrivate: boolean;
  isUnpluggedCorpus: boolean;
  musicVideoType: VideoType;
  isLiveContent: boolean;
}

export interface Caption {
  url: string;
  name: string;
  vssId: string;
  lang: string;
  translatable: boolean;
}

export interface Song {
  /** @deprecated */
  formats: Format[];
  adaptive_formats: Format[];
  expires: Date;
  videoDetails: VideoDetails;
  playerConfig: any;
  playbackTracking: any;
  videostatsPlaybackUrl: string;
  captions: Caption[];
  hlsManifestUrl: string | null;
  aspectRatio: number;
  serverAbrStreamingUrl: string;
}

export async function get_album_browse_id(
  audio_playlist_id: string,
  options: AbortOptions = {},
): Promise<string | null> {
  const json = await request_json("browse", {
    data: {
      browseId: audio_playlist_id.startsWith("VL")
        ? audio_playlist_id
        : "VL" + audio_playlist_id,
    },
    signal: options.signal,
  });

  return jo(
    json,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    "musicPlaylistShelfRenderer",
    CONTENT,
    MRLIR,
    "flexColumns[2]",
    MRLITFC,
    "runs[0]",
    NAVIGATION_BROWSE_ID,
  ) as string | null;
}

export async function get_song(
  video_id: string,
  options: AbortOptions = {},
): Promise<Song> {
  const response = await request_json("player", {
    data: {
      ...CONSTANTS2.ANDROID.DATA,
      contentCheckOk: true,
      racyCheckOk: true,
      video_id,
    },
    signal: options.signal,
  });

  const song: Song = {
    formats: response.streamingData.formats?.map(parse_format) ?? [],
    adaptive_formats: response.streamingData.adaptiveFormats.map(
      parse_format,
    ),
    expires: new Date(
      new Date().getTime() +
        (Number(response.streamingData.expiresInSeconds) * 1000),
    ),
    videoDetails: {
      ...response.videoDetails,
      lengthSeconds: Number(response.videoDetails.lengthSeconds),
      viewCount: Number(response.videoDetails.viewCount),
    },
    playerConfig: response.playerConfig,
    playbackTracking: response.playbackTracking,
    videostatsPlaybackUrl:
      response.playbackTracking.videostatsPlaybackUrl.baseUrl,
    captions:
      jo(response, "captions.playerCaptionsTracklistRenderer.captionTracks")
        ?.map((caption: any) => ({
          url: caption.baseUrl,
          name: j(caption, "name.runs[0].text"),
          vssId: caption.vssId,
          lang: caption.languageCode,
          translatable: caption.isTranslatable,
        } as Caption)) ?? [],
    hlsManifestUrl: response.streamingData.hlsManifestUrl,
    aspectRatio: response.videoDetails.aspectRatio,
    serverAbrStreamingUrl: response.streamingData.serverManifestStreamUrl,
  };

  return song;
}

export async function get_song_related(
  browseId: string,
  options: AbortOptions = {},
): Promise<MixedContent[]> {
  if (!browseId) throw new Error("No browseId provided");

  const json = await request_json("browse", {
    data: {
      browseId,
    },
    signal: options.signal,
  });

  const sections = j(json, "contents", SECTION_LIST);

  return parse_mixed_content(sections);
}

export interface BaseTimedLyrics {
  lyrics: string;
  source: string;
  timed: boolean;
}

export interface UnTimedLyrics extends BaseTimedLyrics {
  timed: false;
}

export interface TimedLyrics extends BaseTimedLyrics {
  timed: true;
  timed_lyrics: {
    line: string;
    start: number;
    end: number;
    id: string;
  }[];
}

export type Lyrics = TimedLyrics | UnTimedLyrics;

export async function get_lyrics(
  browseId: string,
  options: AbortOptions = {},
): Promise<Lyrics> {
  if (!browseId) {
    throw new TypeError(
      "Invalid browseId provided. This song might not have lyrics.",
    );
  }

  const json = await request_json("browse", {
    data: { browseId, ...CONSTANTS2.ANDROID.DATA },
    signal: options.signal,
  });

  const synced_data = jo(
    json,
    "contents.elementRenderer.newElement.type.componentType.model.timedLyricsModel.lyricsData",
  );

  if (synced_data) {
    const lyrics: Lyrics = {
      timed: true,
      source: jo(
        synced_data,
        "sourceMessage",
      ),
      lyrics: jo(synced_data, "timedLyricsData")
        ?.map((line: any) => {
          return line.lyricLine;
        })
        .map((line: string) => {
          if (line === "♪") {
            return "\n";
          }

          return line;
        })
        .join("\n")
        .trim(),
      timed_lyrics: jo(synced_data, "timedLyricsData")
        ?.map((line: any) => {
          return {
            line: line.lyricLine,
            start: +line.cueRange.startTimeMilliseconds,
            end: +line.cueRange.endTimeMilliseconds,
            id: line.cueRange.metadata.id,
          };
        }) ?? [],
    };

    return lyrics;
  } else {
    const lyrics: Lyrics = {
      timed: false,
      lyrics: jo(
        json,
        "contents",
        SECTION_LIST_ITEM,
        DESCRIPTION_SHELF,
        DESCRIPTION,
      ),
      source: jo(
        json,
        "contents",
        SECTION_LIST_ITEM,
        DESCRIPTION_SHELF,
        "footer",
        RUN_TEXT,
      ),
    };

    return lyrics;
  }
}

export interface ArtistAlbums {
  artist: string | null;
  title: string;
  results: ParsedAlbum[];
  sort: SortOptions;
}

export async function get_artist_albums(
  channelId: string,
  params: string,
  options: Omit<PaginationOptions, "limit"> = {},
): Promise<ArtistAlbums> {
  const data = {
    browseId: channelId,
    params,
  };

  function get_chips(renderer: any) {
    const header = j(renderer, "header.musicSideAlignedItemRenderer");

    const chips = j(header, "startItems.0.chipCloudRenderer.chips");

    const selected_chip = j(
      chips
        .find((chip: any) => chip.chipCloudChipRenderer.isSelected == true),
      "chipCloudChipRenderer",
      TEXT_RUN_TEXT,
    );

    return {
      selected_chip: selected_chip as string,
      sort_options: get_sort_options(header.endItems),
    };
  }

  if (options.continuation) {
    return get_sort_continuations(
      options.continuation,
      "sectionListContinuation",
      (params) => {
        return request_json("browse", {
          data,
          params,
          signal: options.signal,
        });
      },
      (contents, continuation) => {
        const chips = get_chips(continuation);

        return {
          artist: null,
          title: chips.selected_chip,
          results: parse_content_list(
            j(contents[0], GRID_ITEMS),
            parse_album,
          ),
          sort: chips.sort_options,
        };
      },
    )! as Promise<ArtistAlbums>;
  }

  const json = await request_json("browse", {
    data,
    signal: options.signal,
  });

  const columnTab = j(json, SINGLE_COLUMN_TAB);

  const grid = j(columnTab, SECTION_LIST_ITEM, GRID);

  const chips = get_chips(j(columnTab, "sectionListRenderer"));

  return {
    artist: j(json, "header.musicHeaderRenderer", TITLE_TEXT),
    title: chips.selected_chip,
    results: parse_content_list(grid.items, parse_album),
    sort: chips.sort_options,
  };
}

export interface Channel extends ChannelContents {
  name: string;
  channelId: string;
  thumbnails: Thumbnail[];
  songs_on_repeat: {
    results: PlaylistItem[];
  } | null;
}

export async function get_channel(
  channelId: string,
  options: AbortOptions = {},
): Promise<Channel> {
  const json = await request_json("browse", {
    data: { browseId: channelId },
    signal: options.signal,
  });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);
  const header = j(json, "header.musicVisualHeaderRenderer");

  const channel: Channel = {
    name: j(header, TITLE_TEXT),
    channelId: find_context_param(json, "browse_id"),
    thumbnails: jo(
      header,
      "foregroundThumbnail.musicThumbnailRenderer",
      THUMBNAIL,
    ),
    ...parse_channel_contents(results),
    songs_on_repeat: null,
  };

  if ("musicShelfRenderer" in results[0]) {
    const musicShelf = j(results[0], `${MUSIC_SHELF}`);

    channel.songs_on_repeat = {
      results: parse_playlist_items(musicShelf.contents),
    };
  }

  return channel;
}

/**
 * @deprecated Use `get_channel` instead.
 */
export const get_user = get_channel;

export interface ChannelPlaylists {
  artist: string;
  title: string;
  results: ParsedPlaylist[];
}

export async function get_channel_playlists(
  channelId: string,
  params: string,
  options: AbortOptions = {},
): Promise<ChannelPlaylists> {
  const json = await request_json("browse", {
    data: {
      browseId: channelId,
      params,
    },
    signal: options.signal,
  });

  const grid = j(json, SINGLE_COLUMN_TAB, SECTION_LIST_ITEM, GRID);

  return {
    artist: j(json, "header.musicHeaderRenderer", TITLE_TEXT),
    title: j(grid, "header.gridHeaderRenderer", TITLE_TEXT),
    results: parse_content_list(grid.items, parse_playlist),
  };
}

/**
 * @deprecated Use `get_channel_playlists` instead.
 */
export const get_user_playlists = get_channel_playlists;
