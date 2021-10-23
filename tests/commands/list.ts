import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function listTests(
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

  await run("blpoop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.blpop(2, "list"), ["list", "1"]);
  });

  await run("blpoop timeout", async () => {
    assertEquals(await client.blpop(1, "list"), []);
  });

  await run("brpoop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.brpop(2, "list"), ["list", "2"]);
  });

  await run("brpoop timeout", async () => {
    assertEquals(await client.brpop(1, "list"), []);
  });

  await run("brpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.brpoplpush("list", "list", 2), "2");
  });

  await run("brpoplpush timeout", async () => {
    assertEquals(await client.brpoplpush("list", "list", 1), []);
  });

  await run("lindex", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lindex("list", 0), "1");
    assertEquals(await client.lindex("list", 3), undefined);
  });

  await run("linsert", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.linsert("list", "BEFORE", "2", "1.5"), 3);
  });

  await run("llen", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.llen("list"), 2);
  });

  await run("lpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpop("list"), "1");
  });

  await run("lpos", async () => {
    await client.rpush("list", "a", "b", "c", "1");
    assertEquals(await client.lpos("list", "c"), 2);
    assertEquals(await client.lpos("list", "d"), undefined);
  });

  await run("lpos with rank", async () => {
    await client.rpush("list", "a", "b", "c", "1", "2", "c", "c", "d");
    assertEquals(await client.lpos("list", "c", { rank: 2 }), 5);
  });

  await run("lpos with count", async () => {
    await client.rpush("list", "a", "b", "c", "1", "2", "b", "c");
    assertEquals(await client.lpos("list", "b", { count: 2 }), [1, 5]);
  });

  await run("lpos with maxlen", async () => {
    await client.rpush("list", "a", "b", "c");
    assertEquals(await client.lpos("list", "c", { maxlen: 2 }), undefined);
    assertEquals(await client.lpos("list", "c", { maxlen: 3 }), 2);
  });

  await run("lpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpush("list", "3", "4"), 4);
  });

  await run("lpushx", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpushx("list", "3"), 3);
  });

  await run("lrange", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lrange("list", 0, -1), ["1", "2"]);
  });
  //

  await run("lrem", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lrem("list", 0, "1"), 1);
  });

  await run("lset", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lset("list", 0, "0"), "OK");
  });

  await run("ltrim", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.ltrim("list", 0, 1), "OK");
  });

  await run("rpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpop("list"), "2");
  });

  await run("rpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpoplpush("list", "list"), "2");
  });

  await run("rpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpush("list", "3"), 3);
  });

  await run("rpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpushx("list", "3"), 3);
  });
  cleanup();
}
