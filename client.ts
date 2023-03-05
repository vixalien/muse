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
import { parse_artist_contents } from "./parsers/browsing.ts";
import { parse_playlist_items } from "./parsers/playlists.ts";

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
    const response = await this.request(endpoint, options);
    return response.json();
  }

  get_playlist(playlistId: string) {
    return this.request("browse", {
      data: {
        browseId: playlistId,
      },
      method: "POST",
    });
  }

  async get_artist(artistId: string) {
    if (artistId.startsWith("MPLA")) artistId = artistId.slice(4);

    // const json = await this.request_json("browse", {
    //   data: {
    //     browseId: artistId,
    //   },
    // });
    // Deno.writeTextFileSync("store/artist.json", JSON.stringify(json, null, 2));

    const json = await Deno.readTextFile("store/artist.json").then(JSON.parse);

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
