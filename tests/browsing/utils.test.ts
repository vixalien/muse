import {
  afterAll,
  assertEquals,
  assertRejects,
  beforeAll,
  describe,
  it,
} from "../util.ts";

import * as util from "../../mixins/utils.ts";

it("get_timestamp", () => {
  const one_day = 24 * 60 * 60 * 1000;
  const timestamp = Math.round(
    (new Date().getTime() - new Date(0).getTime()) /
      one_day,
  ) - 7;
  assertEquals(util.get_timestamp(), timestamp);
});

describe("check_auth", () => {
  let stored_token: any;

  beforeAll(async () => {
    stored_token = util.auth.has_token() ? await util.auth.get_token() : null;
  });

  afterAll(() => {
    util.auth.token = stored_token;
  });

  it("should throw error if not logged in", () => {
    util.auth.token = null;
    assertRejects(() => util.check_auth());
  });

  it("should not throw error if logged in", () => {
    util.auth.token = { dummy: "token" } as any;
    util.check_auth();
  });
});
