import {
  assert,
  assertEquals,
  beforeAll,
  Client,
  describe,
  init_client,
  it,
} from "./util.ts";

describe("browsing", () => {
  let client: Client;

  beforeAll(() => {
    client = init_client();
  });

  it("should get home", async () => {
    const home6 = await client.get_home(6);
    assert(home6.results.length >= 6);
    const home15 = await client.get_home(15);
    assert(home15.results.length >= 15);
  });

  it("should get artist", async () => {
    const artist = await client.get_artist("UCvyjk7zKlaFyNIPZ-Pyvkng");
    assertEquals(artist.name, "RAYE");

    // tests correctness of related artists
    const related = artist.related.results;
    assertEquals(
      related,
      related.filter((artist: any) => {
        const keys = ["browseId", "subscribers", "title", "thumbnails"];
        return !keys.reduce((prev, curr) => prev || !artist[curr], false);
      }),
    );
  });
});
