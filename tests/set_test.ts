import { makeTest } from "./test_util.ts";
import {
  assertEquals,
  assertArrayContains,
  assert,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
const { test, client } = await makeTest("set");

test("sadd", async () => {
  assertEquals(await client.sadd("key", "1", "2", "1"), 2);
});

test("scard", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.scard("key"), 2);
});

test("sdiff", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertArrayContains(await client.sdiff("key", "key2"), ["2"]);
});
test("sdiffstore", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertEquals(await client.sdiffstore("dest", "key", "key2"), 1);
});
test("sinter", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertArrayContains(await client.sinter("key", "key2"), ["1"]);
});
test("sinterstore", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertEquals(await client.sinterstore("dest", "key", "key2"), 1);
});
test("sismember", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.sismember("key", "1"), 1);
});
test("smembers", async () => {
  await client.sadd("key", "1", "2");
  assertArrayContains(await client.smembers("key"), ["1", "2"]);
});
test("smove", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.smove("key", "dest", "1"), 1);
});
test("spop", async () => {
  await client.sadd("key", "a");
  const v = await client.spop("key");
  assertEquals(v, "a");
});
test("spop with count", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.spop("key", 2);
  assertArrayContains(v, ["a", "b"]);
});
test("srandmember", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.srandmember("key");
  assertArrayContains(["a", "b"], [v]);
});
test("srandmember with count", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.srandmember("key", 3);
  assertArrayContains(["a", "b", undefined], v);
});

test("srem", async () => {
  await client.sadd("key", "a", "b");
  assertEquals(await client.srem("key", "a"), 1);
});
test("sunion", async () => {
  await client.sadd("key", "a", "b");
  await client.sadd("key2", "b", "c");
  const v = await client.sunion("key", "key2");
  assertArrayContains(v, ["a", "b", "c"]);
});
test("sunionstore", async () => {
  await client.sadd("key", "a", "b");
  await client.sadd("key2", "b", "c");
  const v = await client.sunionstore("dest", "key", "key2");
  assertEquals(v, 3);
});
test("sscan", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.sscan("key", 0);
  assert(Array.isArray(v));
});
