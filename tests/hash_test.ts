import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("hash");
const server = await startRedis({ port: 7006 });
const client = await newClient({ hostname: "127.0.0.1", port: 7006 });

suite.beforeEach(async () => {
  await client.flushdb();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("hdel", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hdel("key", "f1", "f2", "f3"), 2);
});

suite.test("hexists", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hexists("key", "f1"), 1);
  assertEquals(await client.hexists("key", "f2"), 0);
});

suite.test("hget", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hget("key", "f1"), "1");
  assertEquals(await client.hget("key", "f2"), undefined);
});

suite.test("hgetall", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hgetall("key"), ["f1", "1", "f2", "2"]);
});

suite.test("hincrby", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hincrby("key", "f1", 4), 5);
});

suite.test("hincybyfloat", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hincrbyfloat("key", "f1", 4.33), "5.33");
});

suite.test("hkeys", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hkeys("key"), ["f1", "f2"]);
});

suite.test("hlen", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hlen("key"), 2);
});

suite.test("hmget", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hmget("key", "f1", "f2", "f3"), [
    "1",
    "2",
    undefined,
  ]);
});

suite.test("hmset", async () => {
  assertEquals(await client.hmset("key", "f1", "1"), "OK");
  assertEquals(await client.hmset("key", "f1", "1", "f2", "2"), "OK");
});

suite.test("hset", async () => {
  assertEquals(await client.hset("key", "f1", "1"), 1);
  assertEquals(await client.hset("key", "f2", "2", "f3", "3"), 2);
});

suite.test("hsetnx", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hsetnx("key", "f1", "1"), 0);
  assertEquals(await client.hsetnx("key", "f2", "2"), 1);
});

suite.test("hstrlen", async () => {
  await client.hset("key", "f1", "abc");
  assertEquals(await client.hstrlen("key", "f1"), 3);
});

suite.test("hvals", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hvals("key"), ["1", "2"]);
});

suite.test("hscan", async () => {
  assertEquals(Array.isArray(await client.hscan("key", 0)), true);
});

suite.runTests();
