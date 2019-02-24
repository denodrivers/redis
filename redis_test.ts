import { connect } from "./redis.ts";
import { test, assert } from "https://deno.land/x/std@v0.2.11/testing/mod.ts";
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
  assert.equal(none, 0);
  await redis.set("exists", "aaa");
  const exists = await redis.exists("exists", "none");
  assert.equal(exists, 1);
  redis.close();
});

test(async function testGetWhenNil() {
  const redis = await connect(addr);
  const hoge = await redis.get("none");
  assert.equal(hoge, void 0);
  redis.close();
});
test(async function testSet() {
  const redis = await connect(addr);
  const s = await redis.set("get", "fuga");
  assert.equal(s, "OK");
  const fuga = await redis.get("get");
  assert.equal(fuga, "fuga");
  redis.close();
});
test(async function testGetSet() {
  const redis = await connect(addr);
  await redis.set("getset", "val");
  const v = await redis.getset("getset", "lav");
  assert.equal(v, "val");
  assert.equal(await redis.get("getset"), "lav");
  redis.close();
});
test(async function testMget() {
  const redis = await connect(addr);
  await redis.set("mget1", "val1");
  await redis.set("mget2", "val2");
  await redis.set("mget3", "val3");
  const v = await redis.mget("mget1", "mget2", "mget3");
  assert.equal(v, ["val1", "val2", "val3"]);
  redis.close();
});
test(async function testDel() {
  const redis = await connect(addr);
  let s = await redis.set("del1", "fuga");
  assert.equal(s, "OK");
  s = await redis.set("del2", "fugaaa");
  assert.equal(s, "OK");
  const deleted = await redis.del("del1", "del2");
  assert.equal(deleted, 2);
  redis.close();
});

test(async function testIncr() {
  const redis = await connect(addr);
  const rep = await redis.incr("incr");
  assert.equal(rep, 1);
  assert.equal(await redis.get("incr"), "1");
  redis.close();
});

test(async function testIncrby() {
  const redis = await connect(addr);
  const rep = await redis.incrby("incrby", 101);
  assert.equal(rep, 101);
  assert.equal(await redis.get("incrby"), "101");
  redis.close();
});

test(async function testDecr() {
  const redis = await connect(addr);
  const rep = await redis.decr("decr");
  assert.equal(rep, -1);
  assert.equal(await redis.get("decr"), "-1");
  redis.close();
});

test(async function testDecrby() {
  const redis = await connect(addr);
  const rep = await redis.decrby("decryby", 101);
  assert.equal(rep, -101);
  assert.equal(await redis.get("decryby"), "-101");
  redis.close();
});
