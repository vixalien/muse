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

    return { title: title.toLowerCase(), id };
  };

  const items = j(response, SINGLE_COLUMN_TAB, SECTION_LIST);

  return items.map(extractor).filter(Boolean);
}

const base_map = new Map([
  // artist
  ["albums", "albums"],
  ["singles", "singles"],
  ["videos", "videos"],
  ["library", "from your library"],
  ["featured", "featured on"],
  ["playlists", "playlists"],
  ["related", "fans might also like"],
  // explore
  ["new albums", "new albums & singles"],
  ["top songs", "top songs"],
  ["moods", "moods & genres"],
  ["trending", "trending"],
  // charts
  ["top songs", "top songs"],
  ["top videos", "top music videos"],
  ["top artists", "top artists"],
  ["genres", "genres"],
  /// trending is duplicated
]);

export async function get_base_strings() {
  set_option("language", "en");

  const [explore, charts, artist] = await Promise.all([
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
  ]);

  const id_map: Record<string, any> = {};

  const ids = [...explore, ...charts, ...artist];

  console.log("ids", { explore, charts, artist });

  base_map.forEach((value, key) => {
    const item = ids.find((i) => i.title.toLowerCase() === value);

    if (!item) {
      console.error("missing", key, value);
      return;
    }

    id_map[key] = item.id;
  });

  return id_map;
}

export async function get_strings_for_language(
  base_id_map: Record<string, string>,
  language: string,
) {
  set_option("language", language);

  const [explore, charts, artist] = await Promise.all([
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
  ]);

  const id_map: Record<string, any> = {};

  const ids = [...explore, ...charts, ...artist];

  for (const key in base_id_map) {
    const id = base_id_map[key];

    const item = ids.find((i) => i.id === id);

    if (!item) {
      console.error("missing", key, id);
      continue;
    }

    id_map[key] = item.title;
  }

  return id_map;
}

export async function get_all_strings() {
  const base_id_map = await get_base_strings();

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
  // for (const language of languages) {
  //   if (language === "en-GB") continue;

  //   strings[language] = await get_strings_for_language(base_id_map, language);
  //   console.log("got", language);
  // }

  // a version that allows a max of 5 requests at a time
  for (let i = 0; i < languages.length; i += 8) {
    const slice = languages.slice(i, i + 8);

    await Promise.all(
      slice.map(async (language) => {
        if (language === "en") return;

        strings[language] = await get_strings_for_language(
          base_id_map,
          language,
        );

        // also print progress
        console.log(
          Object.keys(strings).length,
          "/",
          languages.length,
          ":",
          language,
        );
      }),
    );
  }

  return strings;
}

await get_all_strings()
  .then((data) => {
    Deno.writeTextFile("locales/strings.json", JSON.stringify(data));
  });
