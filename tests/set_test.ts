import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("set");
const server = await startRedis({ port: 7010 });
const client = await newClient({ hostname: "127.0.0.1", port: 7010 });

suite.beforeEach(async () => {
  await client.flushdb();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("sadd", async () => {
  assertEquals(await client.sadd("key", "1", "2", "1"), 2);
});

suite.test("scard", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.scard("key"), 2);
});

suite.test("sdiff", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertArrayIncludes(await client.sdiff("key", "key2"), ["2"]);
});

suite.test("sdiffstore", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertEquals(await client.sdiffstore("dest", "key", "key2"), 1);
});

suite.test("sinter", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertArrayIncludes(await client.sinter("key", "key2"), ["1"]);
});

suite.test("sinterstore", async () => {
  await client.sadd("key", "1", "2");
  await client.sadd("key2", "1", "3");
  assertEquals(await client.sinterstore("dest", "key", "key2"), 1);
});

suite.test("sismember", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.sismember("key", "1"), 1);
});

suite.test("smembers", async () => {
  await client.sadd("key", "1", "2");
  assertArrayIncludes(await client.smembers("key"), ["1", "2"]);
});

suite.test("smove", async () => {
  await client.sadd("key", "1", "2");
  assertEquals(await client.smove("key", "dest", "1"), 1);
});

suite.test("spop", async () => {
  await client.sadd("key", "a");
  const v = await client.spop("key");
  assertEquals(v, "a");
});

suite.test("spop with count", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.spop("key", 2);
  assertArrayIncludes(v, ["a", "b"]);
});

suite.test("srandmember", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.srandmember("key");
  assertArrayIncludes(["a", "b"], [v]);
});

suite.test("srandmember with count", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.srandmember("key", 3);
  assertArrayIncludes(["a", "b", undefined], v);
});

suite.test("srem", async () => {
  await client.sadd("key", "a", "b");
  assertEquals(await client.srem("key", "a"), 1);
});

suite.test("sunion", async () => {
  await client.sadd("key", "a", "b");
  await client.sadd("key2", "b", "c");
  const v = await client.sunion("key", "key2");
  assertArrayIncludes(v, ["a", "b", "c"]);
});

suite.test("sunionstore", async () => {
  await client.sadd("key", "a", "b");
  await client.sadd("key2", "b", "c");
  const v = await client.sunionstore("dest", "key", "key2");
  assertEquals(v, 3);
});

suite.test("sscan", async () => {
  await client.sadd("key", "a", "b");
  const v = await client.sscan("key", 0);
  assert(Array.isArray(v));
});

suite.runTests();
