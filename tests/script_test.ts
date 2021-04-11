import { connect, Redis } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import {
  assert,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("script");
const port = nextPort();
const server = await startRedis({ port });
const client = await newClient({ hostname: "127.0.0.1", port });

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.afterEach(async () => {
  await client.flushdb();
});

suite.test("eval", async () => {
  const raw = await client.eval(
    "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}",
    ["1", "2"],
    ["3", "4"],
  );
  assert(Array.isArray(raw));
  assertEquals(raw, ["1", "2", "3", "4"]);
});

suite.test("evalsha", async () => {
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

suite.runTests();
