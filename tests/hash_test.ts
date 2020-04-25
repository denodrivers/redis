import { makeTest } from "./test_util.ts";
import {
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";

const { test, client } = await makeTest("hash");

test("hdel", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hdel("key", "f1", "f2", "f3"), 2);
});
test("hexists", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hexists("key", "f1"), 1);
  assertEquals(await client.hexists("key", "f2"), 0);
});
test("hget", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hget("key", "f1"), "1");
  assertEquals(await client.hget("key", "f2"), undefined);
});
test("hgetall", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hgetall("key"), ["f1", "1", "f2", "2"]);
});
test("hincrby", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hincrby("key", "f1", 4), 5);
});
test("hincybyfloat", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hincrbyfloat("key", "f1", 4.33), "5.33");
});
test("hkeys", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hkeys("key"), ["f1", "f2"]);
});
test("hlen", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hlen("key"), 2);
});
test("hmget", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hmget("key", "f1", "f2", "f3"), [
    "1",
    "2",
    undefined,
  ]);
});
test("hmset", async () => {
  assertEquals(await client.hmset("key", "f1", "1"), "OK");
  assertEquals(await client.hmset("key", "f1", "1", "f2", "2"), "OK");
});
test("hset", async () => {
  assertEquals(await client.hset("key", "f1", "1"), 1);
  assertEquals(await client.hset("key", "f2", "2", "f3", "3"), 2);
});
test("hsetnx", async () => {
  await client.hset("key", "f1", "1");
  assertEquals(await client.hsetnx("key", "f1", "1"), 0);
  assertEquals(await client.hsetnx("key", "f2", "2"), 1);
});
test("hstrlen", async () => {
  await client.hset("key", "f1", "abc");
  assertEquals(await client.hstrlen("key", "f1"), 3);
});
test("hvals", async () => {
  await client.hset("key", "f1", "1");
  await client.hset("key", "f2", "2");
  assertEquals(await client.hvals("key"), ["1", "2"]);
});
test("hscan", async () => {
  assertEquals(Array.isArray(await client.hscan("key", 0)), true);
});
