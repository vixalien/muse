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

import { get_home } from "../../mod.ts";

beforeEach(() => {
  init_client();
});

describe("home", () => {
  let home: any;

  beforeAll(async () => {
    home = await get_home(6);
  });

  it("must handle limit", async () => {
    assert(home.results.length >= 6, "should have alteast have 6 results");

    const home30 = await get_home(100);
    console.log("home30", home30);
    assert(
      home30.results.length >= 30,
      "should be able paginate to 30 results",
    );
  });
});
