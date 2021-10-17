import {
  assert,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("zset", async (t) => {
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

  await run("bzpopmin", async () => {
    await client.zadd("key", { "1": 1, "2": 2 });
    assertEquals(await client.bzpopmin(1, "key"), ["key", "1", "1"]);
  });

  await run("bzpopmin timeout", async () => {
    const arr = await client.bzpopmin(1, "key");
    assertEquals(arr.length, 0);
  });

  await run("bzpopmax", async () => {
    await client.zadd("key", { "1": 1, "2": 2 });
    assertEquals(await client.bzpopmax(1, "key"), ["key", "2", "2"]);
  });

  await run("bzpopmax timeout", async () => {
    const arr = await client.bzpopmax(1, "key");
    assertEquals(arr.length, 0);
  });

  await run("zadd", async () => {
    assertEquals(await client.zadd("key", { "1": 1, "2": 2 }), 2);
    assertEquals(await client.zadd("key", 3, "3"), 1);
    assertEquals(
      await client.zadd("key", [
        [4, "4"],
        [5, "5"],
      ]),
      2,
    );
  });

  await run("zcount", async () => {
    await client.zadd("key", { "1": 1, "2": 2 });
    assertEquals(await client.zcount("key", 0, 1), 1);
  });

  await run("zincrby", async () => {
    await client.zadd("key", { "1": 1, "2": 2 });
    const v = await client.zincrby("key", 2.0, "1");
    assert(v != null);
    assert(parseFloat(v) - 3.0 < Number.EPSILON);
  });

  await run("zinterstore", async () => {
    await client.zadd("key", { "1": 1, "2": 2 });
    await client.zadd("key2", { "1": 1, "3": 3 });
    assertEquals(await client.zinterstore("dest", ["key", "key2"]), 1);
  });

  await run("zlexcount", async () => {
    await client.zadd("key2", { "1": 1, "2": 2 });
    assertEquals(await client.zlexcount("key", "-", "(2"), 0);
  });

  await run("zpopmax", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zpopmax("key", 1), ["two", "2"]);
  });

  await run("zrange", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrange("key", 1, 2), ["two"]);
  });

  await run("zrangebylex", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrangebylex("key", "-", "(2"), []);
  });

  await run("zrevrangebylex", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrevrangebylex("key", "(2", "-"), []);
  });

  await run("zrangebyscore", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrangebyscore("key", "1", "2"), ["one", "two"]);
  });

  await run("zrank", async () => {
    await client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrank("key", "two"), 1);
  });

  await run("zrem", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrem("key", "one"), 1);
  });

  await run("zremrangebylex", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zremrangebylex("key", "[one", "[two"), 2);
  });

  await run("zremrangebyrank", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zremrangebyrank("key", 1, 2), 1);
  });

  await run("zremrangebyscore", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zremrangebyscore("key", 1, 2), 2);
  });

  await run("zrevrange", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrevrange("key", 1, 2), ["one"]);
  });

  await run("zrevrangebyscore", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrevrangebyscore("key", 2, 1), ["two", "one"]);
  });

  await run("zrevrank", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zrevrank("key", "one"), 1);
  });

  await run("zscore", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zscore("key", "one"), "1");
  });

  await run("zunionstore", async () => {
    client.zadd("key", { one: 1, two: 2 });
    client.zadd("key2", { one: 1, three: 3 });
    assertEquals(await client.zunionstore("dest", ["key", "key2"]), 3);
  });

  await run("zscan", async () => {
    client.zadd("key", { one: 1, two: 2 });
    assertEquals(await client.zscan("key", 1), ["0", ["one", "1", "two", "2"]]);
  });

  await run("testZrange", async function testZrange() {
    client.zadd("zrange", 1, "one");
    client.zadd("zrange", 2, "two");
    client.zadd("zrange", 3, "three");
    const v = await client.zrange("zrange", 0, 1);
    assertEquals(v, ["one", "two"]);
  });

  await run("testZrangeWithScores", async function testZrangeWithScores() {
    client.zadd("zrangeWithScores", 1, "one");
    client.zadd("zrangeWithScores", 2, "two");
    client.zadd("zrangeWithScores", 3, "three");
    const v = await client.zrange("zrangeWithScores", 0, 1, {
      withScore: true,
    });
    assertEquals(v, ["one", "1", "two", "2"]);
  });

  await run("testZrevrange", async function testZrevrange() {
    client.zadd("zrevrange", 1, "one");
    client.zadd("zrevrange", 2, "two");
    client.zadd("zrevrange", 3, "three");
    const v = await client.zrevrange("zrevrange", 0, 1);
    assertEquals(v, ["three", "two"]);
  });

  await run(
    "testZrevrangeWithScores",
    async function testZrevrangeWithScores() {
      client.zadd("zrevrangeWithScores", 1, "one");
      client.zadd("zrevrangeWithScores", 2, "two");
      client.zadd("zrevrangeWithScores", 3, "three");
      const v = await client.zrevrange("zrevrangeWithScores", 0, 1, {
        withScore: true,
      });
      assertEquals(v, ["three", "3", "two", "2"]);
    },
  );

  await run("testZrangebyscore", async function testZrangebyscore() {
    client.zadd("zrangebyscore", 2, "m1");
    client.zadd("zrangebyscore", 5, "m2");
    client.zadd("zrangebyscore", 8, "m3");
    client.zadd("zrangebyscore", 10, "m4");
    const v = await client.zrangebyscore("zrangebyscore", 3, 9);
    assertEquals(v, ["m2", "m3"]);
  });

  await run(
    "testZrangebyscoreWithScores",
    async function testZrangebyscoreWithScores() {
      client.zadd("zrangebyscoreWithScores", 2, "m1");
      client.zadd("zrangebyscoreWithScores", 5, "m2");
      client.zadd("zrangebyscoreWithScores", 8, "m3");
      client.zadd("zrangebyscoreWithScores", 10, "m4");
      const v = await client.zrangebyscore("zrangebyscoreWithScores", 3, 9, {
        withScore: true,
      });
      assertEquals(v, ["m2", "5", "m3", "8"]);
    },
  );

  await run("testZrevrangebyscore", async function testZrevrangebyscore() {
    client.zadd("zrevrangebyscore", 2, "m1");
    client.zadd("zrevrangebyscore", 5, "m2");
    client.zadd("zrevrangebyscore", 8, "m3");
    client.zadd("zrevrangebyscore", 10, "m4");
    const v = await client.zrevrangebyscore("zrevrangebyscore", 9, 4);
    assertEquals(v, ["m3", "m2"]);
  });

  await run("testZrevrangebyscore", async function testZrevrangebyscore() {
    client.zadd("zrevrangebyscoreWithScores", 2, "m1");
    client.zadd("zrevrangebyscoreWithScores", 5, "m2");
    client.zadd("zrevrangebyscoreWithScores", 8, "m3");
    client.zadd("zrevrangebyscoreWithScores", 10, "m4");
    const v = await client.zrevrangebyscore(
      "zrevrangebyscoreWithScores",
      9,
      4,
      {
        withScore: true,
      },
    );
    assertEquals(v, ["m3", "8", "m2", "5"]);
  });

  cleanup();
});
