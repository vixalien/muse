import { Authenticator, PureAuthenticatorOptions } from "./auth.ts";
import { FetchClient, RequestClient, RequestInit } from "./request.ts";
import { get_default_store, Store } from "./store.ts";

import CONSTANTS2 from "./constants-ng.json" assert { type: "json" };
import { j } from "./util.ts";
import {
  DESCRIPTION,
  DESCRIPTION_SHELF,
  find_object_by_key,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "./nav.ts";
import {
  parse_artist_contents,
  parse_mixed_content,
} from "./parsers/browsing.ts";
import { parse_playlist_items } from "./parsers/playlists.ts";
import { exists } from "./deps.ts";
import { get_continuations } from "./continuations.ts";

interface ClientOptions {
  auth?: PureAuthenticatorOptions;
  client?: RequestClient;
  store?: Store;
}

export class Client {
  store: Store;
  client: RequestClient;
  auth: Authenticator;

  get_auth_headers() {
    return this.auth.get_headers();
  }

  constructor(options: ClientOptions = {}) {
    this.store = options.store ?? get_default_store();
    this.client = options.client ?? new FetchClient(this.store);
    this.auth = new Authenticator({
      client: this.client,
      store: this.store,
      ...options.auth,
    });
  }

  async request(endpoint: string, options: RequestInit) {
    const auth_headers = await this.get_auth_headers();

    return this.client.request(
      `${CONSTANTS2.API_URL}/${endpoint}`,
      {
        method: options.method || "post",
        data: {
          ...CONSTANTS2.DATA,
          ...options.data,
        },
        headers: {
          ...CONSTANTS2.HEADERS,
          ...auth_headers,
          "Content-Type": "application/json",
          "X-Goog-Request-Time": (new Date()).getTime().toString(),
          ...options.headers,
        },
        params: {
          ...options.params,
        },
      },
    );
  }

  async request_json(endpoint: string, options: RequestInit) {
    const cache = Object.keys(options.params || {}).length == 0;

    // caching
    const path = `store/${
      new URLSearchParams({ ...options.data } as any || {})
        .toString()
    }.json`;

    const cached = await Deno.readTextFile(path)
      .then(JSON.parse).catch(() => null);

    if (cache && cached) return cached;

    const response = await this.request(endpoint, options);
    const json = await response.json();

    if (cache) await Deno.writeTextFile(path, JSON.stringify(json, null, 2));

    return json;
  }

  async get_home(limit = 3, continuation?: string) {
    const endpoint = "browse";
    const data = { browseId: "FEmusic_home" };

    const home: { continuation: string | null; results: any[] } = {
      continuation: null,
      results: [],
    };

    let section_list;

    if (continuation) {
      home.continuation = continuation;
      home.results = [];
    } else {
      const json = await this.request_json(endpoint, { data });

      const results = j(json, SINGLE_COLUMN_TAB, SECTION_LIST);

      section_list = j(json, SINGLE_COLUMN_TAB, "sectionListRenderer");

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
          return this.request_json(endpoint, {
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

  async get_artist(artistId: string) {
    if (artistId.startsWith("MPLA")) artistId = artistId.slice(4);

    const json = await this.request_json("browse", {
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
      shuffleId: j(
        header,
        `playButton.buttonRenderer.${NAVIGATION_PLAYLIST_ID}`,
      ),
      radioId: j(
        header,
        `startRadioButton.buttonRenderer.${NAVIGATION_PLAYLIST_ID}`,
      ),
      subscribers: j(subscription_button, "subscriberCountText.runs[0].text"),
      subscribed: j(subscription_button, "subscribed"),
      thumbnails: j(header, THUMBNAILS),
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
}
