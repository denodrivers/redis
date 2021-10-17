import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("hash", async (t) => {
  const port = nextPort();
  const server = await startRedis({ port });
  const client = await newClient({ hostname: "127.0.0.1", port });

  function cleanup(): void {
    stopRedis(server);
    client.close();
  }

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    await t.step(name, async () => {
      await client.flushdb();
      await fn();
    });
  }

  await run("hdel", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hdel("key", "f1", "f2", "f3"), 2);
  });

  await run("hexists", async () => {
    await client.hset("key", "f1", "1");
    assertEquals(await client.hexists("key", "f1"), 1);
    assertEquals(await client.hexists("key", "f2"), 0);
  });

  await run("hget", async () => {
    await client.hset("key", "f1", "1");
    assertEquals(await client.hget("key", "f1"), "1");
    assertEquals(await client.hget("key", "f2"), undefined);
  });

  await run("hgetall", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hgetall("key"), ["f1", "1", "f2", "2"]);
  });

  await run("hincrby", async () => {
    await client.hset("key", "f1", "1");
    assertEquals(await client.hincrby("key", "f1", 4), 5);
  });

  await run("hincybyfloat", async () => {
    await client.hset("key", "f1", "1");
    assertEquals(await client.hincrbyfloat("key", "f1", 4.33), "5.33");
  });

  await run("hkeys", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hkeys("key"), ["f1", "f2"]);
  });

  await run("hlen", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hlen("key"), 2);
  });

  await run("hmget", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hmget("key", "f1", "f2", "f3"), [
      "1",
      "2",
      undefined,
    ]);
  });

  await run("hmset", async () => {
    assertEquals(await client.hmset("key", "f1", "1"), "OK");
    assertEquals(await client.hmset("key", { f1: "1", f2: "2" }), "OK");
    assertEquals(await client.hmset("key", ["f4", "4"], ["f5", "5"]), "OK");
  });

  await run("hset", async () => {
    assertEquals(await client.hset("key", "f1", "1"), 1);
    assertEquals(await client.hset("key", { f2: "2", f3: "3" }), 2);
    assertEquals(await client.hset("key", ["f4", "4"], ["f5", "5"]), 2);
  });

  await run("hsetnx", async () => {
    await client.hset("key", "f1", "1");
    assertEquals(await client.hsetnx("key", "f1", "1"), 0);
    assertEquals(await client.hsetnx("key", "f2", "2"), 1);
  });

  await run("hstrlen", async () => {
    await client.hset("key", "f1", "abc");
    assertEquals(await client.hstrlen("key", "f1"), 3);
  });

  await run("hvals", async () => {
    await client.hset("key", "f1", "1");
    await client.hset("key", "f2", "2");
    assertEquals(await client.hvals("key"), ["1", "2"]);
  });

  await run("hscan", async () => {
    assertEquals(Array.isArray(await client.hscan("key", 0)), true);
  });

  cleanup();
});
