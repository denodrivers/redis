import { on } from "./on.ts";
import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "../deps/std/assert.ts";

Deno.test({
  name: "on",
  permissions: "none",
  fn: async (t) => {
    await t.step("implements [Symbol.asyncIterator]", async () => {
      const eventType = "foo";
      const target = new EventTarget();
      const ac = new AbortController();
      const iter = on(target, eventType, { signal: ac.signal });
      const events: Array<Event> = [];
      const promise = (async () => {
        for await (const event of iter) {
          assertStrictEquals(event.type, eventType);
          events.push(event);
          if (events.length > 2) {
            ac.abort();
          }
        }
      })();
      target.dispatchEvent(new CustomEvent(eventType));
      target.dispatchEvent(new CustomEvent(eventType + "bar"));
      target.dispatchEvent(new CustomEvent(eventType));
      target.dispatchEvent(new CustomEvent(eventType));
      await promise;
      assertEquals(await iter.next(), { done: true, value: undefined });
      assertStrictEquals(events.length, 3);
    });

    await t.step("implements Symbol.asyncIterator#return()", async () => {
      const eventType = "bar";
      const target = new EventTarget();
      const ac = new AbortController();
      const iter = on(target, eventType, { signal: ac.signal });

      target.dispatchEvent(new CustomEvent(eventType));
      const result = await iter.next();
      assertStrictEquals(result.done, false);
      assertStrictEquals(result.value.type, eventType);

      assert(iter.return != null);
      iter.return();

      assertEquals(await iter.next(), { done: true, value: undefined });
      target.dispatchEvent(new CustomEvent(eventType));
      assertEquals(await iter.next(), { done: true, value: undefined });
    });
  },
});
