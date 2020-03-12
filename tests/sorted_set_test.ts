import { makeTest } from "./test_util.ts";
import {
  assertEquals,
  assertArrayContains,
  assert,
  assertThrows
} from "../vendor/https/deno.land/std/testing/asserts.ts";
const { test, client } = await makeTest("zet");

test("zadd", async () => {
  assertEquals(await client.zadd("key", [
    [1, "1"],
    [2, "2"]
  ]), 2);
});

test("zcount", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"]
  ]);
  assertEquals(await client.zcount("key", 0, 1), 1);
});
test("zincrby", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"]
  ]);
  const v = await client.zincrby("key", 2.0, "1");
  assert(v != null);
  assert(parseFloat(v) - 3.0 < Number.EPSILON);
});

test("zinterstore", async () => {
  await client.zadd("key", [
    [1, "1"],
    [2, "2"]
  ]);
  await client.zadd("key2", [
    [1, "1"],
    [3, "3"]
  ]);
  assertEquals(await client.zinterstore("dest", 2, ["key", "key2"]), 1);
});

test("zlexcount", async () => {
  await client.zadd("key2", [
    [1, "1"],
    [2, "2"]
  ]);
  assertEquals(await client.zlexcount("key", "-", "(2"), 0);
});

test("zpopmax", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
  ]);
  assertEquals(await client.zpopmax("key", 1), ["two", "2"]);
});

test("zrange", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
  ]);
  assertEquals(await client.zrange("key", 1, 2), ["two"]);
});

test("zrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
  ]);
  assertEquals(await client.zrangebylex("key", "-", "(2"), []);
});

test("zrevrangebylex", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
  ]);
  assertEquals(await client.zrevrangebylex("key", "(2", "-"), []);
});

test("zrangebyscore", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
  ]);
  assertEquals(await client.zrangebyscore("key", "1", "2"), ["one", "two"]);
});

test("zrank", async () => {
  await client.zadd("key", [
    [1, "one"],
    [2, "two"]
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
    ["one", "1", "two", "2"]
  ]);
});
