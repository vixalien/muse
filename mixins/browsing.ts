import CONSTANTS2 from "../constants-ng.json" assert { type: "json" };

import { get_continuations } from "../continuations.ts";
import { SINGLE_COLUMN_TAB,SECTION_LIST, DESCRIPTION, DESCRIPTION_SHELF, find_object_by_key, MUSIC_SHELF, NAVIGATION_BROWSE_ID, NAVIGATION_PLAYLIST_ID, THUMBNAILS, TITLE, TITLE_TEXT, CAROUSEL, SECTION_LIST_ITEM } from "../nav.ts";
import { parse_album_header } from "../parsers/albums.ts";
import { parse_moods,parse_mixed_content, parse_artist_contents, parse_album, parse_content_list } from "../parsers/browsing.ts";
import { parse_playlist_items } from "../parsers/playlists.ts";
import { parse_format } from "../parsers/songs.ts";
import { j, jo, sum_total_duration } from "../util.ts";
import { request_json } from "./_request.ts";

export async function get_home(limit = 3, continuation?: string) {
  const endpoint = "browse";
  const data = { browseId: "FEmusic_home" };

  const home: { continuation: string | null; moods: any[]; results: any[] } = {
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


export async function get_artist(artistId: string) {
  if (artistId.startsWith("MPLA")) artistId = artistId.slice(4);

  const json = await request_json("browse", {
    data: {
      browseId: artistId,
    },
  });

  const results = j(json, `${SINGLE_COLUMN_TAB}.${SECTION_LIST}`);
  // console.log("results", results);
  const header = j(json, "header.musicImmersiveHeaderRenderer");
  const subscription_button = j(
    header,
    "subscriptionButton.subscribeButtonRenderer",
  );

  const artist: any = {
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
    subscribed: j(subscription_button, "subscribed"),
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

export async function get_album(
  browseId: string,
) {
  const response = await request_json("browse", {
    data: {
      browseId,
    },
  });

  const album = parse_album_header(response);
  const results = j(
    response,
    SINGLE_COLUMN_TAB,
    SECTION_LIST_ITEM,
    MUSIC_SHELF,
  );

  album.tracks = parse_playlist_items(results.contents);

  const carousel = jo(
    response,
    SINGLE_COLUMN_TAB,
    SECTION_LIST,
    "1",
    CAROUSEL,
  );

  if (carousel != null) {
    album.other_versions = parse_content_list(results.contents, parse_album);
  }

  album.duration_seconds = sum_total_duration(album);

  for (const i in album.tracks) {
    const track = album.tracks[i];
    album.tracks[i] = {
      ...track,
      album: album.title,
      artists: album.artists,
    };
  }

  return album;
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

  return {
    formats: response.streamingData.formats.map(parse_format),
    adaptive_formats: response.streamingData.adaptiveFormats.map(
      parse_format,
    ),
    expires: new Date(
      new Date().getTime() +
        (Number(response.streamingData.expiresInSeconds) * 1000),
    ),
    videoDetails: response.videoDetails,
    playerConfig: response.playerConfig,
  };
}