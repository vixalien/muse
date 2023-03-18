import { assertEquals, it } from "./util.ts";

import * as util from "../util.ts";

it("sum_total_duration", () => {
  const item = {
    tracks: [
      {
        duration_seconds: 1,
      },
      {
        duration_seconds: 2,
      },
      {
        duration_seconds: 3,
      },
    ],
  };
  assertEquals(util.sum_total_duration(item), 6);
});
