import { get_continuations } from "../continuations.ts";
import {
  BADGE_LABEL,
  MRLIR,
  MRLITFC,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_ID,
  RUN_TEXT,
  SECTION_LIST,
  THUMBNAILS,
  TITLE_TEXT,
} from "../nav.ts";
import { _ } from "../parsers/browsing.ts";
import {
  Filter,
  filters,
  get_search_params,
  parse_search_results,
  parse_top_result,
  Scope,
  scopes,
  SearchContent,
} from "../parsers/search.ts";
import { j, jo } from "../util.ts";
import { Thumbnail } from "./playlist.ts";
import { AbortOptions, PaginationOptions } from "./utils.ts";
import { request_json } from "./_request.ts";
import { TopResult } from "../mod.ts";

export type {
  SearchAlbum,
  SearchArtist,
  SearchContent,
  SearchPlaylist,
  SearchRadio,
  SearchSong,
  SearchVideo,
  TopResult,
  TopResultAlbum,
  TopResultArtist,
  TopResultSong,
} from "../parsers/search.ts";

export type SearchRuns = {
  text: string;
  bold?: true;
  italics?: true;
}[];

export interface ArtistQuickLink {
  type: "artist";
  thumbnails: Thumbnail[];
  name: string;
  id: string;
}

export interface SongQuickLink {
  type: "song" | "video";
  thumbnails: Thumbnail[];
  title: string;
  videoId: string;
  artists: {
    name: string;
    id: string;
  }[];
  isExplicit: boolean;
}

export type SearchQuickLink = ArtistQuickLink | SongQuickLink;

export interface SearchSuggestions {
  history: {
    search: SearchRuns;
    feedback_token: string;
    query: string;
  }[];
  suggestions: {
    query: string;
    search: SearchRuns;
  }[];
  quick_links: SearchQuickLink[];
}

export async function get_search_suggestions(
  query: string,
  options: AbortOptions = {},
): Promise<SearchSuggestions> {
  const json = await request_json("music/get_search_suggestions", {
    params: {
      input: query,
    },
    signal: options.signal,
  });

  const results = j(json, "contents");

  const suggestions: SearchSuggestions = {
    suggestions: [],
    quick_links: [],
    history: [],
  };

  if (results[0]) {
    const items = j(results[0], "searchSuggestionsSectionRenderer.contents");

    for (const item of items) {
      if ("historySuggestionRenderer" in item) {
        const query = j(item, "historySuggestionRenderer");

        suggestions.history.push({
          search: j(query, "suggestion.runs"),
          feedback_token: j(
            query,
            "serviceEndpoint.feedbackEndpoint.feedbackToken",
          ),
          query: j(query, "navigationEndpoint.searchEndpoint.query"),
        });
      } else if ("searchSuggestionRenderer" in item) {
        const query = j(item, "searchSuggestionRenderer");

        suggestions.suggestions.push({
          search: j(query, "suggestion.runs"),
          query: j(query, "navigationEndpoint.searchEndpoint.query"),
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
        suggestions.quick_links.push({
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
            suggestions.quick_links.push({
              type,
              title: j(first, "text"),
              videoId: j(first, NAVIGATION_VIDEO_ID),
              thumbnails: j(data, THUMBNAILS),
              artists: [
                {
                  name: j(artist, "text"),
                  id: j(artist, NAVIGATION_BROWSE_ID),
                },
              ],
              isExplicit: jo(data, BADGE_LABEL) != null,
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

  return suggestions;
}

export interface SearchOptions extends PaginationOptions {
  filter?: Filter;
  scope?: Scope;
  ignore_spelling?: boolean;
}

export interface SearchResults {
  top_result: TopResult | null;
  did_you_mean: { search: SearchRuns; query: string } | null;
  categories: {
    title: string;
    results: SearchContent[];
  }[];
  continuation: string | null;
  autocorrect: {
    original: { search: SearchRuns; query: string };
    corrected: { search: SearchRuns; query: string };
  } | null;
}

export interface SearchOptions extends PaginationOptions {
  filter?: Filter;
  scope?: Scope;
  autocorrect?: boolean;
}

export async function search(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResults> {
  const {
    filter,
    scope,
    autocorrect = true,
    limit = 20,
    continuation: _continuation = null,
    signal,
  } = options;

  let continuation: any = _continuation;

  const data = { query } as any;
  const endpoint = "search";

  const search_results: SearchResults = {
    top_result: null,
    did_you_mean: null,
    categories: [],
    continuation: null,
    autocorrect: null,
  };

  if (filter != null && !filters.includes(filter)) {
    throw new Error(
      `Invalid filter provided. Please use one of the following filters or leave out the parameter: ${
        filters.join(", ")
      }`,
    );
  }

  if (scope != null && !scopes.includes(scope)) {
    throw new Error(
      `Invalid scope provided. Please use one of the following scopes or leave out the parameter: ${
        scopes.join(", ")
      }`,
    );
  }

  if (scope == "uploads" && filter != null) {
    throw new Error(
      "No filter can be set when searching uploads. Please unset the filter parameter when scope is set to uploads",
    );
  }

  const params = get_search_params(filter, scope, autocorrect);

  if (params) {
    data.params = params;
  }

  if (!continuation) {
    const response = await request_json(endpoint, { data, signal });

    let results;

    // no results
    if (!("contents" in response)) {
      return search_results;
    } else if ("tabbedSearchResultsRenderer" in response.contents) {
      const tab_index = (!scope || filter)
        ? 0
        : scopes.indexOf(scope as any) + 1;
      results = response.contents.tabbedSearchResultsRenderer.tabs[tab_index]
        .tabRenderer.content;
    } else {
      results = response.contents;
    }

    const section_list = j(results, SECTION_LIST);

    // no results
    if (
      !section_list ||
      (section_list.length == 1 && ("itemSectionRenderer" in section_list[0]))
    ) {
      return search_results;
    }

    for (const res of section_list) {
      if ("musicShelfRenderer" in res) {
        const results = j(res, "musicShelfRenderer.contents");
        const category = jo(res, MUSIC_SHELF, TITLE_TEXT);

        const category_search_results = parse_search_results(
          results,
          scope ?? null,
          filter ?? null,
        );

        if (category_search_results.length > 0) {
          search_results.categories.push({
            title: category ?? null,
            results: category_search_results,
          });
        }

        if ("continuations" in res["musicShelfRenderer"]) {
          continuation = res.musicShelfRenderer;
        }
      } else if ("musicCardShelfRenderer" in res) {
        // top result with details
        search_results.top_result = parse_top_result(
          j(res, "musicCardShelfRenderer"),
        );
      } else if ("itemSectionRenderer" in res) {
        const did_you_mean = jo(
          res,
          "itemSectionRenderer.contents[0].didYouMeanRenderer",
        );

        if (did_you_mean) {
          search_results.did_you_mean = {
            search: j(did_you_mean, "correctedQuery.runs"),
            query: j(
              did_you_mean,
              "correctedQueryEndpoint.searchEndpoint.query",
            ),
          };
        }

        const autocorrect = jo(
          res,
          "itemSectionRenderer.contents[0].showingResultsForRenderer",
        );

        if (autocorrect) {
          search_results.autocorrect = {
            corrected: {
              search: j(autocorrect, "correctedQuery.runs"),
              query: j(
                autocorrect,
                "correctedQueryEndpoint.searchEndpoint.query",
              ),
            },
            original: {
              search: j(autocorrect, "originalQuery.runs"),
              query: j(
                autocorrect,
                "originalQueryEndpoint.searchEndpoint.query",
              ),
            },
          };
        }
      }
    }
  }

  // limit only works when there's a filter
  if (continuation && filter) {
    const continued_data = await get_more_search_results(continuation, {
      scope: scope ?? null,
      filter,
      limit: limit -
        search_results.categories.reduce(
          (acc, curr) => acc + curr.results.length,
          0,
        ),
      signal,
    });

    // TODO: don't lowercase translations
    // and this wont work when filters are translated (should default)
    // to the first category
    let category = search_results.categories.find((category) =>
      category.title === filter
    );

    if (!category) {
      category = search_results.categories[
        search_results.categories.push({
          title: filter,
          results: [],
        }) - 1
      ];
    }

    search_results.continuation = continued_data.continuation;
    category.results.push(...continued_data.results);
  }

  return search_results;
}

export interface MoreSearchResultOptions extends PaginationOptions {
  filter?: Filter | null;
  scope?: Scope | null;
}

export async function get_more_search_results(
  continuation: string,
  options: Omit<MoreSearchResultOptions, "continuation">,
) {
  const { limit = 20, scope, filter, signal } = options;

  const continued_data = await get_continuations(
    continuation,
    "musicShelfContinuation",
    limit,
    (params) => {
      return request_json("search", { params, signal });
    },
    (contents) => {
      return parse_search_results(contents, scope ?? null, filter ?? null);
    },
  );

  return {
    continuation: continued_data.continuation,
    results: continued_data.items as SearchContent[],
  };
}
