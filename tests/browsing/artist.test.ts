import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertMatch,
  beforeAll,
  beforeEach,
  describe,
  init_client,
  it,
} from "../util.ts";

import { get_artist } from "../../mod.ts";

beforeEach(() => {
  init_client();
});

// describe("home", async () => {
//   const home = await get_home(6);

//   it("must handle limit", async () => {
//     assert(home.results.length >= 6);
//     const home15 = await get_home(30);
//     assert(home15.results.length >= 30);
//   });
// });

describe("artist", () => {
  let artist: any;

  beforeAll(async () => {
    artist = await get_artist("UCvyjk7zKlaFyNIPZ-Pyvkng");
  });

  it("name", () => {
    assertEquals(typeof artist.description, "string");
  });

  it("description", () => {
    assertEquals(typeof artist.description, "string");
    assert(artist.description.length > 30);
  });

  it("channelId", () => {
    assertEquals(typeof artist.channelId, "string");
    assert(artist.channelId.length === 24);
    assert(artist.channelId.startsWith("UC"));
  });

  it("shuffleId", () => {
    assertEquals(typeof artist.shuffleId, "string");
    assert(artist.shuffleId.length === 26);
    assert(artist.shuffleId.startsWith("RDA"));
  });

  it("radioId", () => {
    assertEquals(typeof artist.radioId, "string");
    assert(artist.radioId.length === 26);
    assert(artist.radioId.startsWith("RDEM"));
  });

  it("subscribers", () => {
    assertEquals(typeof artist.subscribers, "string");
  });

  it("views", () => {
    assertEquals(typeof artist.views, "string");
    assert(artist.views.endsWith("views"));
  });

  it("subscribed", () => {
    assertEquals(typeof artist.subscribed, "boolean");
  });

  it("thumbnails", () => {
    assert(artist.thumbnails.length > 0);

    // tests correctness of thumbnails
    const thumbnails = artist.thumbnails;
    thumbnails.forEach((thumbnail: any) => {
      assertEquals(typeof thumbnail.url, "string");
      assertEquals(new URL(thumbnail.url).href, thumbnail.url);
      assertEquals(typeof thumbnail.width, "number");
      assertEquals(typeof thumbnail.height, "number");
    });
  });

  describe("songs", () => {
    it("browseId", () => {
      assertEquals(typeof artist.songs.browseId, "string");
      assert(artist.songs.browseId.startsWith("VLOLA"));
    });

    it("should have songs", () => {
      assert(artist.songs.results.length > 0);
    });

    describe("song", () => {
      let song: any;

      beforeAll(() => {
        song = artist.songs.results[0];
      });

      it("title", () => {
        assertEquals(typeof song.title, "string");
        assert(song.title.length > 0);
      });

      it("likeStatus", () => {
        assertEquals(typeof song.likeStatus, "string");
        assertArrayIncludes(["LIKE", "INDIFFERENT", "DISLIKE"], [
          song.likeStatus,
        ]);
      });

      it("videoId", () => {
        assertEquals(typeof song.videoId, "string");
        assert(song.videoId.length === 11);
      });

      it("thumbnails", () => {
        assert(song.thumbnails.length > 0);

        // tests correctness of thumbnails
        const thumbnails = song.thumbnails;
        thumbnails.forEach((thumbnail: any) => {
          assertEquals(typeof thumbnail.url, "string");
          assertEquals(new URL(thumbnail.url).href, thumbnail.url);
          assertEquals(typeof thumbnail.width, "number");
          assertEquals(typeof thumbnail.height, "number");
        });
      });

      describe("album", () => {
        it("present", () => {
          assertExists(song.album);
        });

        it("name", () => {
          assertEquals(typeof song.album.name, "string");
          assert(song.album.name.length > 0);
        });

        it("id", () => {
          assertEquals(typeof song.album.id, "string");
          assert(song.album.id.length === 17);
          assertEquals(song.album.id.slice(0, 6), "MPREb_");
        });
      });

      describe("artists", () => {
        it("present", () => {
          assertExists(song.artists);
        });

        it("length", () => {
          assert(song.artists.length > 0);
        });

        it("name", () => {
          assertEquals(typeof song.artists[0].name, "string");
          assert(song.artists[0].name.length > 0);
        });

        it("id", () => {
          assertEquals(typeof song.artists[0].id, "string");
          assert(song.artists[0].id.length === 24);
          assertEquals(song.artists[0].id.slice(0, 2), "UC");
        });
      });

      it("isAvailable", () => {
        assertEquals(typeof song.isAvailable, "boolean");
      });

      it("isExplicit", () => {
        assertEquals(typeof song.isExplicit, "boolean");
      });

      it("videoType", () => {
        assertEquals(typeof song.videoType, "string");
        assertArrayIncludes([
          // Official Music Videos
          "MUSIC_VIDEO_TYPE_OMV",
          // User Generated Content
          "MUSIC_VIDEO_TYPE_UGC",
          // Artist Videos
          "MUSIC_VIDEO_TYPE_ATV",
        ], [song.videoType]);
      });

      it("feedbackTokens", () => {
        assertExists(song.feedbackTokens);

        assertEquals(typeof song.feedbackTokens.add, "string");
        assert(song.feedbackTokens.add.length === 98);

        assertEquals(typeof song.feedbackTokens.remove, "string");
        assert(song.feedbackTokens.remove.length === 98);
      });
    });
  });

  describe("albums", () => {
    it("browseId", () => {
      assert(typeof artist.albums.browseId || artist.albums.browseId === null);
    });

    it("should have albums", () => {
      assert(artist.albums.results.length > 0);
    });

    describe("album", () => {
      let album: any;

      beforeAll(() => {
        album = artist.albums.results[0];
      });

      it("title", () => {
        assertEquals(typeof album.title, "string");
        assert(album.title.length > 0);
      });

      it("browseId", () => {
        assertEquals(typeof album.browseId, "string");
        assert(album.browseId.length === 17);
        assertEquals(album.browseId.slice(0, 6), "MPREb_");
      });

      it("year", () => {
        if (album.year === null) return;
        assertEquals(typeof album.year, "number");
        assertMatch(album.year, /^\d{4}$/);
      });

      it("isExplicit", () => {
        assertEquals(typeof album.isExplicit, "boolean");
      });

      it("album_type", () => {
        assertEquals(typeof album.album_type, "string");
        assertArrayIncludes(["single", "album", "ep"], [album.album_type]);
      });
    });
  });

  describe("singles", () => {
    it("browseId", () => {
      assert(
        typeof artist.singles.browseId || artist.singles.browseId === null,
      );
    });

    it("should have singles", () => {
      assert(artist.singles.results.length > 0);
    });

    describe("single", () => {
      let single: any;

      beforeAll(() => {
        single = artist.singles.results[0];
      });

      it("title", () => {
        assertEquals(typeof single.title, "string");
        assert(single.title.length > 0);
      });

      it("browseId", () => {
        assertEquals(typeof single.browseId, "string");
        assert(single.browseId.length === 17);
        assertEquals(single.browseId.slice(0, 6), "MPREb_");
      });

      it("year", () => {
        if (single.year === null) return;
        assertEquals(typeof single.year, "number");
        assertMatch(single.year, /^\d{4}$/);
      });

      it("isExplicit", () => {
        assertEquals(typeof single.isExplicit, "boolean");
      });
    });
  });
});
