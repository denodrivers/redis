import {
  assert,
  assertEquals,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function scriptTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const client = await newClient({ hostname: "127.0.0.1", port: server.port });
  function cleanup(): void {
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
}
