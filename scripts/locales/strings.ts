// This module gets all translated strings for all languages
import LOCALES from "../../locales/locales.json" with { type: "json" };

import { request_json } from "../../src/mixins/_request.ts";
import { set_option } from "../../src/mod.ts";
import { setup } from "../../src/setup.ts";
import { DenoFileStore } from "../../src/store.ts";
import { jo, jom } from "../../src/util.ts";
import { cache_fetch } from "../../src/util/cache-fetch.ts";

setup({
  // peoplle in the US get to see more stuff like Top Artists in Charts
  location: "US",
  // you must be logged in
  store: new DenoFileStore("store/muse-store.json"),
  fetch: cache_fetch,
});

const english_strings = new Map([
  // artist
  ["albums", "Albums"],
  ["singles", "Singles"],
  ["videos", "Videos"],
  ["library", "From your library"],
  ["featured", "Featured on"],
  ["playlists", "Playlists"],
  ["related", "Fans might also like"],
  // explore
  ["new albums", "New albums & singles"],
  ["top songs", "Top songs"],
  ["moods", "Moods & genres"],
  ["trending", "Trending"],
  ["new videos", "New music videos"],
  // charts
  ["top songs", "Top songs"],
  ["top videos", "Top music videos"],
  ["top artists", "Top artists"],
  ["genres", "Genres"],
  /// trending is duplicated
  // search
  ["station", "Station"],
  ["playlist", "Playlist"],
  ["artist", "Artist"],
  // This is not that common anymore
  // ["song", "Song"],
  ["video", "Video"],
  ["profile", "Profile"],
  // search titles
  ["songs", "Songs"],
  ["featured_playlists", "Featured playlists"],
  ["community_playlists", "Community playlists"],
  ["artists", "Artists"],
  ["profiles", "Profiles"],
  ["episodes", "Episodes"],
  ["podcasts", "Podcasts"],
  // // user
  ["songs_on_repeat", "Songs on repeat"],
  ["artists_on_repeat", "Artists on repeat"],
  ["playlists_on_repeat", "Playlists on repeat"],
]);

// Because we already have strings we want to look for
// We need to find all those strings in the UI
// After they are found, we will find something that identifies them, so that
// we know where they were found.
// After that, we can use the path to know where exactly those strings were
// found

/**
 * {
 *   "songs_on_repeat": ["channel:CHANNEL_ID", "root.array[0].etc.lol.here"]
 * }
 *
 * // This means that the "songs_on_repeat" string was found in the channel page
 * // and that the path to get it is that, as givem
 */

export interface URIResponse {
  json: any;
  paths?: string[];
}

function parseSearchParams(params: URLSearchParams) {
  const parsedParams = {};

  for (const [key, value] of params.entries()) {
    const nestedKeys = key.split(".");
    let currentObj: Record<string, unknown> = parsedParams;

    for (let i = 0; i < nestedKeys.length - 1; i++) {
      const nestedKey = nestedKeys[i];
      if (!currentObj[nestedKey]) {
        currentObj[nestedKey] = {};
      }
      currentObj = currentObj[nestedKey] as typeof currentObj;
    }

    let parsedArray;

    if (value.startsWith("[") && value.endsWith("]")) {
      parsedArray = value.slice(1, -1).split(",");
    } else {
      parsedArray = value;
    }

    currentObj[nestedKeys[nestedKeys.length - 1]] = parsedArray;
  }

  return parsedParams;
}

/**
 * This functions calls the relevant function from the URI.
 *
 * For example `get_function_uri("channel:CHANNEL_ID")` will call `get_channel`
 */
async function get_uri_response(
  uri: string,
  lang?: string,
): Promise<URIResponse | null> {
  const segments = uri.split(":");
  const url = new URL("muse:" + uri);
  const params = parseSearchParams(url.searchParams);

  const headers = lang
    ? {
      "Accept-Language": `${lang};en;q=0.5`,
    }
    : undefined;

  switch (segments[0]) {
    case "browse": {
      const json = await request_json("browse", {
        data: { browseId: segments[1].split("?")[0], ...params, lang },
        headers,
      });

      return { json };
    }
    case "search": {
      const json = await request_json("search", {
        data: {
          query: decodeURIComponent(segments[1]),
          params: "QgIIAQ%3D%3D",
          ...params,
        },
        headers,
      });

      return { json };
    }
  }

  return null;
}

export interface PathDeclaration {
  path: string;
  value: string;
  parent: any;
  parentProperty: string;
  hasArrExpr: boolean;
  pointer: string;
}

export interface FetchMapItem {
  uri: string;
  paths: string[];
}

export const fetch_map: FetchMapItem[] = [
  {
    uri: "browse:FEmusic_explore",
    paths: [
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents[1:].musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text",
    ],
  },
  {
    // We select the US because they are the ones who can see Genres
    uri: "browse:FEmusic_charts?formData.selectedValues=[US]",
    paths: [
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text",
    ],
  },
  {
    // BTS (because they have playlists on their channel)
    // also don't forget to add atleast one song of to your library
    // and make sure the item you add is NOT the first item in any category
    uri: "browse:UC9vrvNSL3xcWGSkV86REBSg",
    paths: [
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicShelfRenderer.title.runs[0].text",
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text",
    ],
  },
  {
    // Replace with your channel
    uri: "browse:UCSdIilrkpBqG01hzOU6pOTg",
    paths: [
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicShelfRenderer.title.runs.0.text",
      "json.contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs.0.text",
    ],
  },
  {
    uri: "search:get+lucky",
    paths: [
      "json.contents.tabbedSearchResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.header.chipCloudRenderer.chips.*.chipCloudChipRenderer.text.runs.0.text",
      "json.contents.tabbedSearchResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.*.musicShelfRenderer.contents.0.musicResponsiveListItemRenderer.flexColumns.1.musicResponsiveListItemFlexColumnRenderer.text.runs[0].text",
      "json.contents.tabbedSearchResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents.0.musicCardShelfRenderer.subtitle.runs.0.text",
    ],
  },
];

const base_strings = new Map();

async function get_language_map() {
  const map = new Map<string, [uri: string, path: string]>();

  for (const item of fetch_map) {
    const data = await get_uri_response(item.uri);

    for (const path of item.paths) {
      const items = jom(data, path, "all") as PathDeclaration[] ??
        [];

      english_strings.forEach((string, key) => {
        const match = items.find((item) => item.value === string);

        if (!match) return;

        map.set(key, [item.uri, match.path]);
        base_strings.set(key, match.value);
      });
    }
  }

  return map;
}

const base_map = await get_language_map();

async function _test_fetch_map_item(item: FetchMapItem) {
  const data = await get_uri_response(item.uri);

  const items =
    item.paths.map((path) => jom(data, path)).flat() as PathDeclaration[] ??
      [];

  console.log("items", items);
}

// console.log("base map", base_strings);

async function get_strings_for_lang(lang: string) {
  const map = new Map<string, string>();
  set_option("language", lang);

  await Promise.all(fetch_map.map(async (item) => {
    const data = await get_uri_response(item.uri, lang);

    for (const [key, [uri, path]] of base_map.entries()) {
      if (uri !== item.uri) continue;
      const translation = jo(data, path);

      if (translation) map.set(key, translation);
    }
  }));

  if (map.size != base_map.size) {
    console.error(`Some strings were not found for ${lang}:`);
    console.log(Array.from(base_map.keys()).filter((key) => !map.has(key)));
    throw map;
  }

  return map;
}

async function get_all_languages() {
  const languages = LOCALES.languages.map((l) => l.value);
  // const languages = ["fr", "es", "ko", "gl"];

  const strings: Map<string, Map<string, string>> = new Map();

  for (const language of languages) {
    try {
      strings.set(language, await get_strings_for_lang(language));

      console.log(
        "   ",
        strings.size,
        "\t",
        "/",
        languages.length,
        ":",
        language,
      );
    } catch (error) {
      console.log("couldn't get strings for", language, error);
    }
  }

  return strings;
}

async function get_all_languages_json() {
  const data = await get_all_languages();

  return Object.fromEntries(
    Array.from(data.entries()).map(([key, map]) => {
      return [key, Object.fromEntries(map)];
    }),
  );
}

function write_translations(data: Record<string, unknown>) {
  return Deno.writeTextFile("locales/strings.json", JSON.stringify(data));
}

const json = await get_all_languages_json();
await write_translations(json);

console.log("Wrote translations!");
