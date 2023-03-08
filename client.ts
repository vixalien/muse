import { Authenticator, PureAuthenticatorOptions } from "./auth.ts";
import { FetchClient, RequestClient, RequestInit } from "./request.ts";
import { get_default_store, Store } from "./store.ts";

import CONSTANTS2 from "./constants-ng.json" assert { type: "json" };
import { j } from "./util.ts";
import {
  BADGE_LABEL,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  find_object_by_key,
  GRID,
  MRLIR,
  MRLITFC,
  MTRIR,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  RUN_TEXT,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  THUMBNAILS,
  TITLE,
  TITLE_TEXT,
} from "./nav.ts";
import {
  _,
  parse_artist_contents,
  parse_mixed_content,
  parse_mixed_item,
  parse_moods,
} from "./parsers/browsing.ts";
import { parse_playlist_items } from "./parsers/playlists.ts";
import { get_continuations } from "./continuations.ts";
import { parse_format } from "./parsers/songs.ts";

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
    const path = `store/cache/${
      new URLSearchParams({ ...options.data } as any || {})
        .toString()
    }.json`;

    const cached = await Deno.readTextFile(path)
      .then(JSON.parse).catch(() => null);

    if (cache && cached) return cached;

    const response = await this.request(endpoint, options);

    const json = await response.json();

    if (cache) {
      await Deno.mkdir("store/cache", { recursive: true });
      await Deno.writeTextFile(path, JSON.stringify(json, null, 2));
    }

    return json;
  }

  async get_home(limit = 3, continuation?: string) {
    const endpoint = "browse";
    const data = { browseId: "FEmusic_home" };

    const home: { continuation: string | null; moods: any[]; results: any[] } =
      {
        continuation: null,
        results: [],
        moods: [],
      };

    let section_list;

    if (continuation) {
      home.continuation = continuation;
    } else {
      const json = await this.request_json(endpoint, { data });

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

  async get_song(
    video_id: string,
  ) {
    const response = await this.request_json("player", {
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

  /**
   * Library
   */

  async get_library(limit = 20, continuation?: string) {
    const endpoint = "browse";
    const data = {
      browseId: "FEmusic_library_landing",
    };

    const library: {
      continuation: string | null;
      results: any[];
    } = {
      continuation: null,
      results: [],
    };

    if (continuation) {
      library.continuation = continuation;
    } else {
      const json = await this.request_json(endpoint, { data });

      const grid = j(json, SINGLE_COLUMN_TAB, SECTION_LIST, "[0]", GRID);

      const results = j(grid, "items");

      library.results = results.map((result: any) =>
        parse_mixed_item(j(result, MTRIR))
      );

      library.continuation = j(
        grid,
        "continuations[0].nextContinuationData.continuation",
      );
    }

    if (library.continuation) {
      const continued_data = await get_continuations(
        library.continuation,
        "gridContinuation",
        limit - library.results.length,
        (params) => {
          return this.request_json(endpoint, {
            data,
            params,
          });
        },
        (contents) => {
          return contents.map((result: any) =>
            parse_mixed_item(j(result, MTRIR))
          );
        },
      );

      library.continuation = continued_data.continuation;
      library.results.push(...continued_data.items);
    }

    return library;
  }

  async get_search_suggestions(query: string) {
    const json = await this.request_json("music/get_search_suggestions", {
      params: {
        input: query,
      },
    });

    const results = j(json, "contents");

    const suggestions = [], quick_links = [], history = [];

    Deno.writeTextFileSync(
      "store/quick_links.json",
      JSON.stringify(results, null, 2),
    );

    if (results[0]) {
      const items = j(results[0], "searchSuggestionsSectionRenderer.contents");

      for (const item of items) {
        if ("historySuggestionRenderer" in item) {
          const query = j(item, "historySuggestionRenderer");

          history.push({
            search: j(query, "suggestion.runs"),
            feedback_token: j(
              query,
              "serviceEndpoint.feedbackEndpoint.feedbackToken",
            ),
            query: j(query, "navigationEndpoint.searchEndpoint.query"),
          });
        } else if ("searchSuggestionRenderer" in item) {
          const query = j(item, "searchSuggestionRenderer");

          suggestions.push({
            query: j(query, "suggestion.runs"),
            search: j(query, "navigationEndpoint.searchEndpoint.query"),
          });
        }
      }
    }

    if (results[1]) {
      const items = j(results[1], "searchSuggestionsSectionRenderer.contents");

      for (const item of items) {
        const data = j(item, MRLIR);
        const flex_items = j(data, "flexColumns");

        if (flex_items.length === 2) {
          const first = j(flex_items[0], MRLITFC);

          // artist
          quick_links.push({
            type: "artist",
            thumbnails: j(data, THUMBNAILS),
            name: j(first, RUN_TEXT),
            id: j(data, NAVIGATION_BROWSE_ID),
          });
        } else if (flex_items.length === 3) {
          // song or video

          const first = j(flex_items[0], MRLITFC, "runs[0]");
          const second = j(flex_items[1], MRLITFC);

          const artist = j(second, "runs[2]");

          const type = _(j(second, RUN_TEXT).toLowerCase());

          switch (type) {
            case "video":
            case "song":
              quick_links.push({
                type,
                title: j(first, "text"),
                videoId: j(first, NAVIGATION_VIDEO_ID),
                artists: [
                  {
                    name: j(artist, "text"),
                    id: j(artist, NAVIGATION_BROWSE_ID),
                  },
                ],
                isExplicit: j(data, BADGE_LABEL) != null,
              });
              break;
            default:
              console.warn("Unknown search suggestion return type", type);
              break;
          }
        }
        // quick_links.push(item);
      }
    }

    return {
      suggestions,
      quick_links,
      history,
    };
  }
}
