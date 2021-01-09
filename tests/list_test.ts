import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("list");
const server = await startRedis({ port: 7009 });
const client = await newClient({ hostname: "127.0.0.1", port: 7009 });

suite.beforeEach(async () => {
  await client.flushdb();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("blpoop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.blpop(2, "list"), ["list", "1"]);
});

suite.test("blpoop timeout", async () => {
  assertEquals(await client.blpop(1, "list"), []);
});

suite.test("brpoop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.brpop(2, "list"), ["list", "2"]);
});

suite.test("brpoop timeout", async () => {
  assertEquals(await client.brpop(1, "list"), []);
});

suite.test("brpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.brpoplpush("list", "list", 2), "2");
});

suite.test("brpoplpush timeout", async () => {
  assertEquals(await client.brpoplpush("list", "list", 1), []);
});

suite.test("lindex", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lindex("list", 0), "1");
  assertEquals(await client.lindex("list", 3), undefined);
});

suite.test("linsert", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.linsert("list", "BEFORE", "2", "1.5"), 3);
});

suite.test("llen", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.llen("list"), 2);
});

suite.test("lpop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpop("list"), "1");
});

suite.test("lpos", async () => {
  await client.rpush("list", "a", "b", "c", "1");
  assertEquals(await client.lpos("list", "c"), 2);
  assertEquals(await client.lpos("list", "d"), undefined);
});

suite.test("lpos with rank", async () => {
  await client.rpush("list", "a", "b", "c", "1", "2", "c", "c", "d");
  assertEquals(await client.lpos("list", "c", { rank: 2 }), 5);
});

suite.test("lpos with count", async () => {
  await client.rpush("list", "a", "b", "c", "1", "2", "b", "c");
  assertEquals(await client.lpos("list", "b", { count: 2 }), [1, 5]);
});

suite.test("lpos with maxlen", async () => {
  await client.rpush("list", "a", "b", "c");
  assertEquals(await client.lpos("list", "c", { maxlen: 2 }), undefined);
  assertEquals(await client.lpos("list", "c", { maxlen: 3 }), 2);
});

suite.test("lpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpush("list", "3", "4"), 4);
});

suite.test("lpushx", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpushx("list", "3"), 3);
});

suite.test("lrange", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lrange("list", 0, -1), ["1", "2"]);
});
//

suite.test("lrem", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lrem("list", 0, "1"), 1);
});

suite.test("lset", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lset("list", 0, "0"), "OK");
});

suite.test("ltrim", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.ltrim("list", 0, 1), "OK");
});

suite.test("rpop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpop("list"), "2");
});

suite.test("rpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpoplpush("list", "list"), "2");
});

suite.test("rpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpush("list", "3"), 3);
});

suite.test("rpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpushx("list", "3"), 3);
});

suite.runTests();
