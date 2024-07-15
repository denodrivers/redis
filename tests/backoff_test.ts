import { assertEquals } from "../deps/assert.ts";
import { describe, it } from "../deps/testing.ts";

import { exponentialBackoff } from "../backoff.ts";

describe("backoff", {
  permissions: "none",
}, () => {
  describe("exponentialBackoff", () => {
    it("should return exponentially increasing backoff intervals", () => {
      const backoff = exponentialBackoff({
        multiplier: 2,
        maxInterval: 5000,
        minInterval: 1000,
      });

      assertEquals(backoff(1), 1000);
      assertEquals(backoff(2), 2000);
      assertEquals(backoff(3), 4000);
      assertEquals(backoff(4), 5000);
      assertEquals(backoff(5), 5000);
    });
  });
});
