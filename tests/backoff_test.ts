import { assertEquals } from "../vendor/https/deno.land/std/assert/mod.ts";
import { describe, it } from "../vendor/https/deno.land/std/testing/bdd.ts";

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
