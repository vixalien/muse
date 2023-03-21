import CONSTANTS2 from "../constants-ng.json" assert { type: "json" };

import { get_continuations } from "../continuations.ts";
import {
  CAROUSEL,
  CONTENT,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  find_object_by_key,
  GRID_ITEMS,
  MRLIR,
  MRLITFC,
  MTRIR,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  RUN_TEXT,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "../nav.ts";
import { AlbumHeader, parse_album_header } from "../parsers/albums.ts";
import {
  ArtistContents,
  MixedContent,
  Mood,
  parse_album,
  parse_artist_contents,
  parse_content_list,
  parse_mixed_content,
  parse_moods,
  parse_playlist,
  ParsedAlbum,
} from "../parsers/browsing.ts";
import {
  parse_playlist_items,
  PlaylistItem,
  VideoType,
} from "../parsers/playlists.ts";
import { ArtistRun, parse_format } from "../parsers/songs.ts";
import { Format } from "../parsers/types.d.ts";
import { j, jo, sum_total_duration } from "../util.ts";
import { Thumbnail } from "./playlist.ts";
import { request_json } from "./_request.ts";

export interface Home {
  continuation: string | null;
  moods: Mood[];
  results: MixedContent[];
}

export async function get_home(limit = 3, continuation?: string) {
  const endpoint = "browse";
  const data = { browseId: "FEmusic_home" };

  const home: Home = {
    continuation: null,
    results: [],
    moods: [],
  };

  let section_list;

  if (continuation) {
    home.continuation = continuation;
  } else {
    const json = await request_json(endpoint, { data });

    const tab = j(json, SINGLE_COLUMN_TAB);

    const results = j(tab, SECTION_LIST);

    section_list = j(tab, "sectionListRenderer");

    home.moods.push(...parse_moods(tab));

    home.continuation = j(
      section_list,
      "continuations[0].nextContinuationData.continuation",
    );

    home.results = parse_mixed_content(results);
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

export async function get_artist(artistId: string) {
  if (artistId.startsWith("MPLA")) artistId = artistId.slice(4);

  const json = await request_json("browse", {
    data: {
      browseId: artistId,
    },
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
  // const subscription_button = j(
  //   header,
  //   "subscriptionButton.subscribeButtonRenderer",
  // );

  // console.log("results", results);

  // const artist = {
  //   description: null,
  //   views: null,
  //   // channelId: subscription_button.channelId,
  //   // thumbnails: j(header, THUMBNAILS),
  // };

  // return artist;
}

export interface AlbumResultTrack extends PlaylistItem {
  album_name: string;
  artists: ArtistRun[];
}

export interface AlbumResult extends AlbumHeader {
  tracks: AlbumResultTrack[];
  other_versions: ParsedAlbum[] | null;
}

export async function get_album(
  browseId: string,
) {
  const response = await request_json("browse", {
    data: {
      browseId,
    },
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

  const album: AlbumResult = {
    ...parse_album_header(response),
    tracks: parse_playlist_items(results.contents).map((track) => {
      return {
        ...track,
        album_name: album.title,
        artists: album.artists,
      };
    }),
    other_versions: null,
  };

  if (carousel != null) {
    album.other_versions = parse_content_list(results.contents, parse_album);
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

export interface Song {
  formats: Format[];
  adaptive_formats: Format[];
  expires: Date;
  videoDetails: VideoDetails;
  playerConfig: any;
  playbackTracking: any;
  videostatsPlaybackUrl: string;
}

export async function get_album_browse_id(audio_playlist_id: string) {
  const json = await request_json("browse", {
    data: {
      browseId: audio_playlist_id.startsWith("VL")
        ? audio_playlist_id
        : "VL" + audio_playlist_id,
    },
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
) {
  const response = await request_json("player", {
    data: {
      ...CONSTANTS2.ANDROID.DATA,
      contentCheckOk: true,
      racyCheckOk: true,
      video_id,
    },
  });

  const song: Song = {
    formats: response.streamingData.formats.map(parse_format),
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
    videostatsPlaybackUrl: response.playbackTracking.videostatsPlaybackUrl.baseUrl,
  };

  return song;
}

export async function get_song_related(browseId: string) {
  if (!browseId) throw new Error("No browseId provided");

  const json = await request_json("browse", {
    data: {
      browseId,
    },
  });

  const sections = j(json, "contents", SECTION_LIST);

  return parse_mixed_content(sections);
}

export interface Lyrics {
  lyrics: string;
  source: string;
}

export async function get_lyrics(browseId: string) {
  if (!browseId) {
    throw new TypeError(
      "Invalid browseId provided. This song might not have lyrics.",
    );
  }

  const json = await request_json("browse", { data: { browseId } });

  const lyrics: Lyrics = {
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

export async function get_artist_albums(channelId: string, params: string) {
  const json = await request_json("browse", {
    data: {
      browseId: channelId,
      params,
    },
  });

  const results = j(
    json,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    GRID_ITEMS,
  ) as any[];

  return results.map((result: any) => parse_album(result[MTRIR]));
}

export interface User extends ArtistContents {
  name: string;
}

export async function get_user(channelId: string) {
  const json = await request_json("browse", { data: { browseId: channelId } });

  const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

  const user: User = {
    name: j(json, "header.musicVisualHeaderRenderer", TITLE_TEXT),
    ...parse_artist_contents(results),
  };

  return user;
}

export async function get_user_playlists(channelId: string, params: string) {
  const json = await request_json("browse", {
    data: {
      browseId: channelId,
      params,
    },
  });

  const results = j(
    json,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    GRID_ITEMS,
  );

  return parse_content_list(results, parse_playlist);
}
