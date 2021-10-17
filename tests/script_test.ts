import {
  assert,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("script", async (t) => {
  const port = nextPort();
  const server = await startRedis({ port });
  const client = await newClient({ hostname: "127.0.0.1", port });

  function cleanup(): void {
    stopRedis(server);
    client.close();
  }

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    await t.step(name, async () => {
      try {
        await fn();
      } finally {
        await client.flushdb();
      }
    });
  }

  await run("eval", async () => {
    const raw = await client.eval(
      "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}",
      ["1", "2"],
      ["3", "4"],
    );
    assert(Array.isArray(raw));
    assertEquals(raw, ["1", "2", "3", "4"]);
  });

  await run("evalsha", async () => {
    const hash = await client.scriptLoad(
      `return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}`,
    );
    try {
      assertEquals(
        await client.scriptExists(hash),
        [1],
      );

      const result = await client.evalsha(hash, ["a", "b"], ["1", "2"]);
      assert(Array.isArray(result));
      assertEquals(result, ["a", "b", "1", "2"]);
    } finally {
      await client.scriptFlush();
    }
  });

  cleanup();
});
