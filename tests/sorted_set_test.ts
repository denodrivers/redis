import { makeTest } from "./test_util.ts";
import {
  assertEquals,
  assertArrayContains,
  assert,
  assertThrows,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
const { test, client } = await makeTest("zet");

test("bzpopmin", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.bzpopmin("key", 1), ["key", "1", "1"]);
});

test("bzpopmin timeout", async () => {
  const arr = await client.bzpopmin("key", 1);
  assertEquals(arr.length, 0);
});

test("bzpopmax", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.bzpopmax("key", 1), ["key", "2", "2"]);
});

test("bzpopmax timeout", async () => {
  const arr = await client.bzpopmax("key", 1);
  assertEquals(arr.length, 0);
});

test("zadd", async () => {
  assertEquals(
    await client.zadd("key", [
      [1, "1"],
      [2, "2"],
    ]),
    2,
  );
});

test("zcount", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.zcount("key", 0, 1), 1);
});
test("zincrby", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"],
  ]);
  const v = await client.zincrby("key", 2.0, "1");
  assert(v != null);
  assert(parseFloat(v) - 3.0 < Number.EPSILON);
});

test("zinterstore", async () => {
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

test("zlexcount", async () => {
  await client.zadd("key2", [
    [1, "1"],
    [2, "2"],
  ]);
  assertEquals(await client.zlexcount("key", "-", "(2"), 0);
});

test("zpopmax", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zpopmax("key", 1), ["two", "2"]);
});

test("zrange", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrange("key", 1, 2), ["two"]);
});

test("zrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrangebylex("key", "-", "(2"), []);
});

test("zrevrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrevrangebylex("key", "(2", "-"), []);
});

test("zrangebyscore", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrangebyscore("key", "1", "2"), ["one", "two"]);
});

test("zrank", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"],
  ]);
  assertEquals(await client.zrank("key", "two"), 1);
});

test("zrem", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zrem("key", "one"), 1);
});
test("zremrangebylex", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zremrangebylex("key", "[one", "[two"), 2);
});
test("zremrangebyrank", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zremrangebyrank("key", 1, 2), 1);
});
test("zremrangebyscore", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zremrangebyscore("key", 1, 2), 2);
});
test("zrevrange", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zrevrange("key", 1, 2), ["one"]);
});
test("zrevrangebyscore", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zrevrangebyscore("key", 2, 1), ["two", "one"]);
});
test("zrevrank", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zrevrank("key", "one"), 1);
});
test("zscore", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zscore("key", "one"), "1");
});
test("zunionstore", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  client.zadd("key2", [[1, "one"], [3, "three"]]);
  assertEquals(await client.zunionstore("dest", ["key", "key2"]), 3);
});
test("zscan", async () => {
  client.zadd("key", [[1, "one"], [2, "two"]]);
  assertEquals(await client.zscan("key", 1), [
    "0",
    ["one", "1", "two", "2"],
  ]);
});

test("testZrange", async function testZrange() {
  client.zadd("zrange", 1, "one");
  client.zadd("zrange", 2, "two");
  client.zadd("zrange", 3, "three");
  const v = await client.zrange("zrange", 0, 1);
  assertEquals(v, ["one", "two"]);
});

test("testZrangeWithScores", async function testZrangeWithScores() {
  client.zadd("zrangeWithScores", 1, "one");
  client.zadd("zrangeWithScores", 2, "two");
  client.zadd("zrangeWithScores", 3, "three");
  const v = await client.zrange("zrangeWithScores", 0, 1, { withScore: true });
  assertEquals(v, ["one", "1", "two", "2"]);
});

test("testZrevrange", async function testZrevrange() {
  client.zadd("zrevrange", 1, "one");
  client.zadd("zrevrange", 2, "two");
  client.zadd("zrevrange", 3, "three");
  const v = await client.zrevrange("zrevrange", 0, 1);
  assertEquals(v, ["three", "two"]);
});

test("testZrevrangeWithScores", async function testZrevrangeWithScores() {
  client.zadd("zrevrangeWithScores", 1, "one");
  client.zadd("zrevrangeWithScores", 2, "two");
  client.zadd("zrevrangeWithScores", 3, "three");
  const v = await client.zrevrange("zrevrangeWithScores", 0, 1, {
    withScore: true,
  });
  assertEquals(v, ["three", "3", "two", "2"]);
});

test("testZrangebyscore", async function testZrangebyscore() {
  client.zadd("zrangebyscore", 2, "m1");
  client.zadd("zrangebyscore", 5, "m2");
  client.zadd("zrangebyscore", 8, "m3");
  client.zadd("zrangebyscore", 10, "m4");
  const v = await client.zrangebyscore("zrangebyscore", 3, 9);
  assertEquals(v, ["m2", "m3"]);
});

test(
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

test("testZrevrangebyscore", async function testZrevrangebyscore() {
  client.zadd("zrevrangebyscore", 2, "m1");
  client.zadd("zrevrangebyscore", 5, "m2");
  client.zadd("zrevrangebyscore", 8, "m3");
  client.zadd("zrevrangebyscore", 10, "m4");
  const v = await client.zrevrangebyscore("zrevrangebyscore", 9, 4);
  assertEquals(v, ["m3", "m2"]);
});

test("testZrevrangebyscore", async function testZrevrangebyscore() {
  client.zadd("zrevrangebyscoreWithScores", 2, "m1");
  client.zadd("zrevrangebyscoreWithScores", 5, "m2");
  client.zadd("zrevrangebyscoreWithScores", 8, "m3");
  client.zadd("zrevrangebyscoreWithScores", 10, "m4");
  const v = await client.zrevrangebyscore("zrevrangebyscoreWithScores", 9, 4, {
    withScore: true,
  });
  assertEquals(v, ["m3", "8", "m2", "5"]);
});
