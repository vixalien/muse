import LOCALES from "./locales.json" assert { type: "json" };

import { request_json } from "../mixins/_request.ts";
import { set_option, setup } from "../mod.ts";
import {
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CAROUSEL_TITLE,
  MRLIR,
  MTRIR,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  TAB_CONTENT,
  TEXT_RUN_TEXT,
  THUMBNAIL_RENDERER,
  THUMBNAILS,
} from "../nav.ts";
import { j, jo } from "../util.ts";
import { DenoFileStore } from "../store.ts";

setup({
  location: "US",
  // you must be logged in
  store: new DenoFileStore("store/muse-store.json"),
});

function get_thumbnail_url(thumbnails: any[]) {
  return thumbnails.sort((a, b) => a.width - b.width)[0].url;
}

export async function get_search_strings(data: Record<string, any> = {}) {
  const response = await request_json("search", {
    // this is so that the first result is always a radio
    data: { query: "1980s radio", params: "QgIIAQ%3D%3D", ...data },
  });

  return j(
    response,
    "contents.tabbedSearchResultsRenderer",
    TAB_CONTENT,
    SECTION_LIST,
  ).map((item: any) => {
    const shelf = jo(item, "musicShelfRenderer") ||
      jo(item, "musicCardShelfRenderer");

    if (!shelf) return;

    const first_content = jo(shelf, "contents", "[0]");

    // may happen in case of "top result"
    if (!first_content) return;

    const first_data = jo(first_content, MRLIR) ?? jo(first_content, MTRIR) ??
      jo(first_content, "musicNavigationButtonRenderer");

    if (!first_data) {
      return null;
    }

    return {
      title: jo(
        first_data,
        "flexColumns.1.musicResponsiveListItemFlexColumnRenderer",
        TEXT_RUN_TEXT,
      ),
      id: jo(shelf, "bottomEndpoint.searchEndpoint.params"),
    };
  }).filter(Boolean)
    .sort((a: any, b: any) => a.id.localeCompare(b.id))
    .filter((item: any, index: number, array: any[]) => {
      return index === array.findIndex((i) => i.title === item.title);
    });
}

export async function get_content_strings(
  browseId: string,
  data: Record<string, any> = {},
) {
  const response = await request_json("browse", {
    data: { browseId, ...data },
  });

  const extractor = (data: any) => {
    const title = jo(data, CAROUSEL, CAROUSEL_TITLE, "text");

    if (!title) return null;

    const first_content = jo(data, CAROUSEL_CONTENTS, "[0]");
    const first_data = jo(first_content, MRLIR) ?? jo(first_content, MTRIR) ??
      jo(first_content, "musicNavigationButtonRenderer");

    if (!first_data) {
      console.log("got data without first data", jo(data, CAROUSEL_CONTENTS));
      return;
    }

    let id;

    const first_thumbnails = jo(first_data, THUMBNAIL_RENDERER) ??
      jo(first_data, THUMBNAILS);

    const color = jo(first_data, "solid.leftStripeColor");

    if (first_thumbnails) {
      id = get_thumbnail_url(first_thumbnails);
    } else if (color) {
      id = color;
    } else {
      return;
    }

    return { title, id };
  };

  const items = j(response, SINGLE_COLUMN_TAB, SECTION_LIST);

  return items.map(extractor).filter(Boolean);
}

const base_map = new Map([
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
  // charts
  ["top songs", "Top songs"],
  ["top videos", "Top music videos"],
  ["top artists", "Top artists"],
  // TODO: YTM is misbehaving at the moment
  ["genres", "Genres"],
  /// trending is duplicated
  // search
  ["station", "Station"],
  ["playlist", "Playlist"],
  ["artist", "Artist"],
  ["song", "Song"],
  ["video", "Video"],
]);

export async function get_base_strings() {
  set_option("language", "en");

  const [explore, charts, artist, search_radio, search_hello] = await Promise
    .all([
      get_content_strings("FEmusic_explore"),
      get_content_strings("FEmusic_charts", {
        formData: {
          // to get genres
          selectedValues: ["US"],
        },
      }),
      // BTS (because they have playlists on their channel)
      // also don't forget to add atleast one song to your library
      // and make sure the item you add is NOT the first item in any category
      get_content_strings("UC9vrvNSL3xcWGSkV86REBSg"),
      get_search_strings(),
      // to make sure we also get stuff like artists (because there is no artist
      // named "global radio" yet..)
      get_search_strings({ query: "hello" }),
    ]);

  const search = [...search_radio, ...search_hello]
    .filter((item: any, index: number, array: any[]) => {
      return index === array.findIndex((i) => i.title === item.title);
    });

  const id_map: Record<string, any> = {};

  const ids = [...explore, ...charts, ...artist, ...search];

  base_map.forEach((value, key) => {
    const item = ids.find((i) => i.title === value);

    if (!item) {
      console.error("missing", key, value);
      console.log("base id map", ids);
      return;
    }

    id_map[key] = item.id;
  });

  return id_map;
}

const known_params = new Map([
  ["artist", [
    "EgWKAQIgAWoMEAMQBBAJEA4QChAF",
    "EgWKAQIgAWoKEAMQBBAJEAoQBQ%3D%3D",
  ]],
  ["song", [
    "EgWKAQIIAWoMEAMQBBAJEA4QChAF",
    "EgWKAQIIAWoKEAMQBBAJEA4QCg%3D%3D",
  ]],
  ["video", [
    "EgWKAQIQAWoMEAMQBBAJEA4QChAF",
    "EgWKAQIQAWoKEAMQBBAJEA4QCg%3D%3D",
  ]],
  ["playlist", [
    "EgeKAQQoADgBagwQAxAEEAkQDhAKEAU%3D",
    "EgeKAQQoADgBagoQAxAEEAkQDhAK",
  ]],
]);

export async function get_strings_for_language(
  base_id_map: Record<string, string>,
  language: string,
) {
  set_option("language", language);

  const [explore, charts, artist, search_radio, search_hello] = await Promise
    .all([
      get_content_strings("FEmusic_explore", { lang: language }),
      get_content_strings("FEmusic_charts", {
        lang: language,
        formData: {
          selectedValues: ["US"],
        },
      }),
      get_content_strings("UC9vrvNSL3xcWGSkV86REBSg", {
        lang: language,
      }),
      get_search_strings({ lang: language }),
      get_search_strings({ query: "hello" }),
    ]);

  const id_map: Record<string, any> = {};

  const search = [...search_radio, ...search_hello]
    .filter((item: any, index: number, array: any[]) => {
      return index === array.findIndex((i) => i.title === item.title);
    });

  const ids = [...explore, ...charts, ...artist, ...search];

  let logged_missing = false;

  for (const key in base_id_map) {
    const id = base_id_map[key];

    const item = ids.find((i) => {
      if (i.id === id) return true;

      // handling search edge cases
      if (typeof id === "string") {
        for (const [_type, ids] of known_params) {
          if (ids.includes(id)) {
            return ids.includes(i.id);
          }
        }
      }
      return false;
    });

    if (!item) {
      if (!logged_missing) {
        console.log(language, "id map", ids);
        logged_missing = true;
      }
      console.error("missing", key, id);
      continue;
    }

    id_map[key] = item.title;
  }

  return id_map;
}

export async function get_all_strings() {
  const base_id_map = await get_base_strings();

  console.log("base", base_id_map);

  const languages = LOCALES.languages.map((l) => l.value);

  const strings: Record<string, any> = {};

  strings.en = Object.fromEntries(base_map);

  // paralellism won't work: too many requests
  // await Promise.all(
  //   languages.map(async (language) => {
  //     if (language === "en-GB") return;

  //     strings[language] = await get_strings_for_language(base_id_map, language);
  //     console.log("got", language);
  //   }),
  // );

  // serial
  for (const language of languages) {
    if (language === "en-GB") continue;

    strings[language] = await get_strings_for_language(base_id_map, language);

    console.log(
      Object.keys(strings).length - 1,
      "/",
      languages.length,
      ":",
      language,
    );
  }

  // a version that allows a max of 5 requests at a time
  // for (let i = 0; i < languages.length; i += 8) {
  //   const slice = languages.slice(i, i + 8);

  //   await Promise.all(
  //     slice.map(async (language) => {
  //       if (language === "en") return;

  //       strings[language] = await get_strings_for_language(
  //         base_id_map,
  //         language,
  //       );

  //       // also print progress
  //       console.log(
  //         Object.keys(strings).length,
  //         "/",
  //         languages.length,
  //         ":",
  //         language,
  //       );
  //     }),
  //   );
  // }

  return strings;
}

await get_all_strings()
  .then((data) => {
    Deno.writeTextFile("locales/strings.json", JSON.stringify(data));
  });

// await get_search_strings()
//   .then((data) => {
//     Deno.writeTextFile("locales/strings.json", JSON.stringify(data, null, 2));
//   });
