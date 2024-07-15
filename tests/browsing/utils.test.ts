import {
  afterAll,
  assertEquals,
  assertRejects,
  beforeAll,
  describe,
  it,
} from "../util.ts";

import * as muse from "../../src/mod.ts"

it("get_timestamp", () => {
  const one_day = 24 * 60 * 60 * 1000;
  const timestamp = Math.round(
    (new Date().getTime() - new Date(0).getTime()) /
      one_day,
  ) - 7;
  assertEquals(muse.get_timestamp(), timestamp);
});

describe("check_auth", () => {
  let stored_token: any;

  beforeAll(async () => {
    stored_token = muse.get_option("auth").has_token() ? await muse.get_option("auth").get_token() : null;
  });

  afterAll(() => {
    muse.get_option("auth").token = stored_token;
  });

  it("should throw error if not logged in", () => {
    muse.get_option("auth").token = null;
    assertRejects(() => muse.check_auth());
  });

  it("should not throw error if logged in", () => {
    muse.get_option("auth").token = { dummy: "token" } as any;
    muse.check_auth();
  });
});
