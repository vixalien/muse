import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertThumbnails,
  beforeAll,
  beforeEach,
  describe,
  init_client,
  it,
} from "../util.ts";

import { get_home } from "../../mod.ts";

beforeEach(() => {
  init_client();
});

describe("home", () => {
  let home: Awaited<ReturnType<typeof get_home>>;

  beforeAll(async () => {
    home = await get_home(6);
  });

  it("must handle limit", async () => {
    assert(home.results.length >= 6, "should have alteast have 6 results");

    const home30 = await get_home(30);
    assert(
      // there are no more results
      home30.continuation == null ||
        home30.results.length >= 30,
      "should be able paginate to 30 results",
    );
  });

  it("must have continuation", () => {
    assertArrayIncludes(["string", "null"], [typeof home.continuation]);
  });

  describe("moods", () => {
    let mood: any;

    beforeAll(() => {
      mood = home.moods[0];
    });

    it("present", () => {
      assert(home.moods.length > 0);
    });

    it("name", () => {
      assertEquals(typeof mood.name, "string", "mood name must be a string");

      assert(mood.name.length > 0, "mood name must not be blank");
    });

    it("params", () => {
      assertEquals(
        typeof mood.params,
        "string",
        "mood params must be a string",
      );

      assert(mood.params.length > 0, "mood params must not be blank");
    });
  });

  describe("results", () => {
    it("present", () => {
      assert(home.results.length > 0);
    });

    describe("result", () => {
      let result: any;

      beforeAll(() => {
        const get_value = (result: any) => {
          return Number(typeof result.subtitle === "string") +
            Number(result.thumbnails !== null);
        };
        // tries to find result with all the options
        result = home
          .results
          .sort((a, b) => {
            return get_value(b) - get_value(a);
          })[0];
      });

      it("title", () => {
        assertEquals(typeof result.title, "string", "title must be a string");

        assert(result.title.length > 0, "title must not be blank");
      });

      it("browseId", () => {
        assertEquals(
          typeof result.browseId,
          "string",
          "browseId must be a string",
        );

        assert(result.browseId.length > 0, "browseId must not be blank");
      });

      it("subtitle", () => {
        if (!result.subtitle) {
          return console.warn("couldnt find a result with a subtitle");
        }

        assertEquals(
          typeof result.subtitle,
          "string",
          "subtitle must be a string",
        );

        assert(result.subtitle.length > 0, "subtitle must not be blank");
      });

      it("thumbnails", () => {
        if (!result.thumbnails) {
          return console.warn("couldnt find a result with a thumbnails");
        }

        assertThumbnails(result.thumbnails);
      });

      it("should have contents", () => {
        assert(result.contents);
        assert(result.contents.length > 0);
      });
    });

    describe("all contents", () => {
      let contents: any[];

      beforeAll(() => {
        contents = home.results.reduce(
          (acc, curr) => [...acc, ...curr.contents],
          [],
        );
      });

      it("each should have known type", () => {
        contents.forEach((content) => {
          assertArrayIncludes([
            "playlist",
            "song",
            "album",
            "artist",
          ], [content.type]);
        });
      });
    });
  });
});
