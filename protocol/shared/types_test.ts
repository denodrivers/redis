import type { RedisReply } from "./types.ts";
import { isPushReply, newPushReply } from "./types.ts";
import { assertEquals } from "../../deps/std/assert.ts";

Deno.test({
  name: "isPushReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("returns false for a regular array", () => {
      const given: Array<RedisReply> = [];
      const expected = false;
      const actual = isPushReply(given);
      assertEquals(actual, expected);
    });

    await t.step("returns true for an array created by newPushReply", () => {
      const given = newPushReply(0);
      const expected = true;
      const actual = isPushReply(given);
      assertEquals(actual, expected);
    });
  },
});

Deno.test({
  name: "newPushReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("works just like a regular array", () => {
      const subject = newPushReply(2);
      assertEquals(subject.length, 2);
      subject[0] = 1;
      subject[1] = 2;
      subject.push(3);
      assertEquals([...subject], [1, 2, 3]);
    });
  },
});
