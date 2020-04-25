import { makeTest } from "./test_util.ts";
import {
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";

const { test, client } = await makeTest("list");

test("blpoop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.blpop("list", 2), ["list", "1"]);
});
test("blpoop timeout", async () => {
  assertEquals(await client.blpop("list", 1), []);
});
test("brpoop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.brpop("list", 2), ["list", "2"]);
});
test("brpoop timeout", async () => {
  assertEquals(await client.brpop("list", 1), []);
});
test("brpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.brpoplpush("list", "list", 2), "2");
});
test("brpoplpush timeout", async () => {
  assertEquals(await client.brpoplpush("list", "list", 1), []);
});
test("lindex", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lindex("list", 0), "1");
  assertEquals(await client.lindex("list", 3), undefined);
});
test("linsert", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.linsert("list", "BEFORE", "2", "1.5"), 3);
});
test("llen", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.llen("list"), 2);
});
test("lpop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpop("list"), "1");
});
test("lpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpush("list", "3", "4"), 4);
});
test("lpushx", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lpushx("list", "3"), 3);
});
test("lrange", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lrange("list", 0, -1), ["1", "2"]);
});
//
test("lrem", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lrem("list", 0, "1"), 1);
});
test("lset", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.lset("list", 0, "0"), "OK");
});
test("ltrim", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.ltrim("list", 0, 1), "OK");
});
test("rpop", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpop("list"), "2");
});
test("rpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpoplpush("list", "list"), "2");
});
test("rpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpush("list", "3"), 3);
});
test("rpoplpush", async () => {
  await client.rpush("list", "1", "2");
  assertEquals(await client.rpushx("list", "3"), 3);
});
