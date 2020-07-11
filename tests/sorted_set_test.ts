import {
  assert,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("zet");
const server = await startRedis({ port: 7011 });
const client = await newClient({ hostname: "127.0.0.1", port: 7011 });

suite.beforeEach(async () => {
  await client.flushdb();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("bzpopmin", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.bzpopmin("key", 1), ["key", "1", "1"]);
});

suite.test("bzpopmin timeout", async () => {
  const arr = await client.bzpopmin("key", 1);
  assertEquals(arr.length, 0);
});

suite.test("bzpopmax", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.bzpopmax("key", 1), ["key", "2", "2"]);
});

suite.test("bzpopmax timeout", async () => {
  const arr = await client.bzpopmax("key", 1);
  assertEquals(arr.length, 0);
});

suite.test("zadd", async () => {
  assertEquals(
    await client.zadd("key", [
      [1, "1"],
      [2, "2"],
    ]),
    2,
  );
});

suite.test("zcount", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.zcount("key", 0, 1), 1);
});

suite.test("zincrby", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  const v = await client.zincrby("key", 2.0, "1");
  assert(v != null);
  assert(parseFloat(v) - 3.0 < Number.EPSILON);
});

suite.test("zinterstore", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  await client.zadd("key2", [
    [1, "1"],
    [3, "3"],
  ]);
  assertEquals(await client.zinterstore("dest", 2, ["key", "key2"]), 1);
});

suite.test("zlexcount", async () => {
  await client.zadd("key2", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.zlexcount("key", "-", "(2"), 0);
});

suite.test("zpopmax", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zpopmax("key", 1), ["two", "2"]);
});

suite.test("zrange", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrange("key", 1, 2), ["two"]);
});

suite.test("zrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrangebylex("key", "-", "(2"), []);
});

suite.test("zrevrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrevrangebylex("key", "(2", "-"), []);
});

suite.test("zrangebyscore", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrangebyscore("key", "1", "2"), ["one", "two"]);
});

suite.test("zrank", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrank("key", "two"), 1);
});

suite.test("zrem", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrem("key", "one"), 1);
});

suite.test("zremrangebylex", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zremrangebylex("key", "[one", "[two"), 2);
});

suite.test("zremrangebyrank", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zremrangebyrank("key", 1, 2), 1);
});

suite.test("zremrangebyscore", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zremrangebyscore("key", 1, 2), 2);
});

suite.test("zrevrange", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrevrange("key", 1, 2), ["one"]);
});

suite.test("zrevrangebyscore", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrevrangebyscore("key", 2, 1), ["two", "one"]);
});

suite.test("zrevrank", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrevrank("key", "one"), 1);
});

suite.test("zscore", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zscore("key", "one"), "1");
});

suite.test("zunionstore", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  client.zadd("key2", [
    [1, "one"],
    [3, "three"],
  ]);
  assertEquals(await client.zunionstore("dest", ["key", "key2"]), 3);
});

suite.test("zscan", async () => {
  client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zscan("key", 1), ["0", ["one", "1", "two", "2"]]);
});

suite.test("testZrange", async function testZrange() {
  client.zadd("zrange", 1, "one");
  client.zadd("zrange", 2, "two");
  client.zadd("zrange", 3, "three");
  const v = await client.zrange("zrange", 0, 1);
  assertEquals(v, ["one", "two"]);
});

suite.test("testZrangeWithScores", async function testZrangeWithScores() {
  client.zadd("zrangeWithScores", 1, "one");
  client.zadd("zrangeWithScores", 2, "two");
  client.zadd("zrangeWithScores", 3, "three");
  const v = await client.zrange("zrangeWithScores", 0, 1, { withScore: true });
  assertEquals(v, ["one", "1", "two", "2"]);
});

suite.test("testZrevrange", async function testZrevrange() {
  client.zadd("zrevrange", 1, "one");
  client.zadd("zrevrange", 2, "two");
  client.zadd("zrevrange", 3, "three");
  const v = await client.zrevrange("zrevrange", 0, 1);
  assertEquals(v, ["three", "two"]);
});

suite.test("testZrevrangeWithScores", async function testZrevrangeWithScores() {
  client.zadd("zrevrangeWithScores", 1, "one");
  client.zadd("zrevrangeWithScores", 2, "two");
  client.zadd("zrevrangeWithScores", 3, "three");
  const v = await client.zrevrange("zrevrangeWithScores", 0, 1, {
    withScore: true,
  });
  assertEquals(v, ["three", "3", "two", "2"]);
});

suite.test("testZrangebyscore", async function testZrangebyscore() {
  client.zadd("zrangebyscore", 2, "m1");
  client.zadd("zrangebyscore", 5, "m2");
  client.zadd("zrangebyscore", 8, "m3");
  client.zadd("zrangebyscore", 10, "m4");
  const v = await client.zrangebyscore("zrangebyscore", 3, 9);
  assertEquals(v, ["m2", "m3"]);
});

suite.test(
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

suite.test("testZrevrangebyscore", async function testZrevrangebyscore() {
  client.zadd("zrevrangebyscore", 2, "m1");
  client.zadd("zrevrangebyscore", 5, "m2");
  client.zadd("zrevrangebyscore", 8, "m3");
  client.zadd("zrevrangebyscore", 10, "m4");
  const v = await client.zrevrangebyscore("zrevrangebyscore", 9, 4);
  assertEquals(v, ["m3", "m2"]);
});

suite.test("testZrevrangebyscore", async function testZrevrangebyscore() {
  client.zadd("zrevrangebyscoreWithScores", 2, "m1");
  client.zadd("zrevrangebyscoreWithScores", 5, "m2");
  client.zadd("zrevrangebyscoreWithScores", 8, "m3");
  client.zadd("zrevrangebyscoreWithScores", 10, "m4");
  const v = await client.zrevrangebyscore("zrevrangebyscoreWithScores", 9, 4, {
    withScore: true,
  });
  assertEquals(v, ["m3", "8", "m2", "5"]);
});

suite.runTests();
