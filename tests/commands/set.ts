import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function setTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const client = await newClient({ hostname: "127.0.0.1", port: server.port });

  function cleanup(): void {
    client.close();
  }

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    await t.step(name, async () => {
      await client.flushdb();
      await fn();
    });
  }

  await run("sadd", async () => {
    assertEquals(await client.sadd("key", "1", "2", "1"), 2);
  });

  await run("scard", async () => {
    await client.sadd("key", "1", "2");
    assertEquals(await client.scard("key"), 2);
  });

  await run("sdiff", async () => {
    await client.sadd("key", "1", "2");
    await client.sadd("key2", "1", "3");
    assertArrayIncludes(await client.sdiff("key", "key2"), ["2"]);
  });
  await run("sdiffstore", async () => {
    await client.sadd("key", "1", "2");
    await client.sadd("key2", "1", "3");
    assertEquals(await client.sdiffstore("dest", "key", "key2"), 1);
  });
  await run("sinter", async () => {
    await client.sadd("key", "1", "2");
    await client.sadd("key2", "1", "3");
    assertArrayIncludes(await client.sinter("key", "key2"), ["1"]);
  });

  await run("sinterstore", async () => {
    await client.sadd("key", "1", "2");
    await client.sadd("key2", "1", "3");
    assertEquals(await client.sinterstore("dest", "key", "key2"), 1);
  });

  await run("sismember", async () => {
    await client.sadd("key", "1", "2");
    assertEquals(await client.sismember("key", "1"), 1);
  });

  await run("smembers", async () => {
    await client.sadd("key", "1", "2");
    assertArrayIncludes(await client.smembers("key"), ["1", "2"]);
  });

  await run("smove", async () => {
    await client.sadd("key", "1", "2");
    assertEquals(await client.smove("key", "dest", "1"), 1);
  });
  await run("spop", async () => {
    await client.sadd("key", "a");
    const v = await client.spop("key");
    assertEquals(v, "a");
  });

  await run("spop with count", async () => {
    await client.sadd("key", "a", "b");
    const v = await client.spop("key", 2);
    assertArrayIncludes(v, ["a", "b"]);
  });

  await run("srandmember", async () => {
    await client.sadd("key", "a", "b");
    const v = await client.srandmember("key");
    assertArrayIncludes(["a", "b"], [v]);
  });

  await run("srandmember with count", async () => {
    await client.sadd("key", "a", "b");
    const v = await client.srandmember("key", 3);
    assertArrayIncludes(["a", "b", undefined], v);
  });

  await run("srem", async () => {
    await client.sadd("key", "a", "b");
    assertEquals(await client.srem("key", "a"), 1);
  });

  await run("sunion", async () => {
    await client.sadd("key", "a", "b");
    await client.sadd("key2", "b", "c");
    const v = await client.sunion("key", "key2");
    assertArrayIncludes(v, ["a", "b", "c"]);
  });

  await run("sunionstore", async () => {
    await client.sadd("key", "a", "b");
    await client.sadd("key2", "b", "c");
    const v = await client.sunionstore("dest", "key", "key2");
    assertEquals(v, 3);
  });

  await run("sscan", async () => {
    await client.sadd("key", "a", "b");
    const v = await client.sscan("key", 0);
    assert(Array.isArray(v));
  });

  cleanup();
}
