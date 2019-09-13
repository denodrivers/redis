import { connect } from "./redis.ts";
import { test } from "https://deno.land/std@v0.17.0/testing/mod.ts";
import { assertEquals } from "https://deno.land/std@v0.17.0/testing/asserts.ts";
// can be substituted with env variable
const addr = "127.0.0.1:6379";

test(async function beforeAll() {
  const redis = await connect(addr);
  await redis.del(
    "incr",
    "incrby",
    "decr",
    "decryby",
    "get",
    "getset",
    "del1",
    "del2"
  );
});

test(async function testExists() {
  const redis = await connect(addr);
  const none = await redis.exists("none", "none2");
  assertEquals(none, 0);
  await redis.set("exists", "aaa");
  const exists = await redis.exists("exists", "none");
  assertEquals(exists, 1);
  redis.close();
});

test(async function testGetWhenNil() {
  const redis = await connect(addr);
  const hoge = await redis.get("none");
  assertEquals(hoge, void 0);
  redis.close();
});
test(async function testSet() {
  const redis = await connect(addr);
  const s = await redis.set("get", "fuga你好こんにちは");
  assertEquals(s, "OK");
  const fuga = await redis.get("get");
  assertEquals(fuga, "fuga你好こんにちは");
  redis.close();
});
test(async function testGetSet() {
  const redis = await connect(addr);
  await redis.set("getset", "val");
  const v = await redis.getset("getset", "lav");
  assertEquals(v, "val");
  assertEquals(await redis.get("getset"), "lav");
  redis.close();
});
test(async function testMget() {
  const redis = await connect(addr);
  await redis.set("mget1", "val1");
  await redis.set("mget2", "val2");
  await redis.set("mget3", "val3");
  const v = await redis.mget("mget1", "mget2", "mget3");
  assertEquals(v, ["val1", "val2", "val3"]);
  redis.close();
});
test(async function testDel() {
  const redis = await connect(addr);
  let s = await redis.set("del1", "fuga");
  assertEquals(s, "OK");
  s = await redis.set("del2", "fugaaa");
  assertEquals(s, "OK");
  const deleted = await redis.del("del1", "del2");
  assertEquals(deleted, 2);
  redis.close();
});

test(async function testIncr() {
  const redis = await connect(addr);
  const rep = await redis.incr("incr");
  assertEquals(rep, 1);
  assertEquals(await redis.get("incr"), "1");
  redis.close();
});

test(async function testIncrby() {
  const redis = await connect(addr);
  const rep = await redis.incrby("incrby", 101);
  assertEquals(rep, 101);
  assertEquals(await redis.get("incrby"), "101");
  redis.close();
});

test(async function testDecr() {
  const redis = await connect(addr);
  const rep = await redis.decr("decr");
  assertEquals(rep, -1);
  assertEquals(await redis.get("decr"), "-1");
  redis.close();
});

test(async function testDecrby() {
  const redis = await connect(addr);
  const rep = await redis.decrby("decryby", 101);
  assertEquals(rep, -101);
  assertEquals(await redis.get("decryby"), "-101");
  redis.close();
});
