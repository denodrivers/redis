import { connect, Redis } from "./redis.ts";
import {
  runIfMain,
  setFilter,
  test
} from "./vendor/https/deno.land/std/testing/mod.ts";
import {
  assertEquals,
  assertThrowsAsync,
  assertArrayContains
} from "./vendor/https/deno.land/std/testing/asserts.ts";
// can be substituted with env variable
const addr = {
  hostname: "127.0.0.1",
  port: 6379
};

let redis: Redis;
test(async function beforeAll() {
  redis = await connect(addr);
  await redis.del(
    "incr",
    "incrby",
    "decr",
    "decryby",
    "get",
    "getset",
    "del1",
    "del2",
    "spop",
    "spopWithCount"
  );
});

test(async function testExists() {
  const none = await redis.exists("none", "none2");
  assertEquals(none, 0);
  await redis.set("exists", "aaa");
  const exists = await redis.exists("exists", "none");
  assertEquals(exists, 1);
});

test(async function testGetWhenNil() {
  const hoge = await redis.get("none");
  assertEquals(hoge, void 0);
});

test(async function testSet() {
  const s = await redis.set("get", "fuga你好こんにちは");
  assertEquals(s, "OK");
  const fuga = await redis.get("get");
  assertEquals(fuga, "fuga你好こんにちは");
});

test(async function testGetSet() {
  await redis.set("getset", "val");
  const v = await redis.getset("getset", "lav");
  assertEquals(v, "val");
  assertEquals(await redis.get("getset"), "lav");
});

test(async function testMget() {
  await redis.set("mget1", "val1");
  await redis.set("mget2", "val2");
  await redis.set("mget3", "val3");
  const v = await redis.mget("mget1", "mget2", "mget3");
  assertEquals(v, ["val1", "val2", "val3"]);
});

test(async function testDel() {
  let s = await redis.set("del1", "fuga");
  assertEquals(s, "OK");
  s = await redis.set("del2", "fugaaa");
  assertEquals(s, "OK");
  const deleted = await redis.del("del1", "del2");
  assertEquals(deleted, 2);
});

test(async function testIncr() {
  const rep = await redis.incr("incr");
  assertEquals(rep, 1);
  assertEquals(await redis.get("incr"), "1");
});

test(async function testIncrby() {
  const rep = await redis.incrby("incrby", 101);
  assertEquals(rep, 101);
  assertEquals(await redis.get("incrby"), "101");
});

test(async function testDecr() {
  const rep = await redis.decr("decr");
  assertEquals(rep, -1);
  assertEquals(await redis.get("decr"), "-1");
});

test(async function testDecrby() {
  const rep = await redis.decrby("decryby", 101);
  assertEquals(rep, -101);
  assertEquals(await redis.get("decryby"), "-101");
});

test(async function testSpop() {
  await redis.sadd("spop", "a");
  const v = await redis.spop("spop");
  assertEquals(v, "a");
});

test(async function testSpopWithCount() {
  await redis.sadd("spopWithCount", "a", "b");
  const v = await redis.spop("spopWithCount", 2);
  assertArrayContains(v, ["a", "b"]);
});

test(async function testConcurrent() {
  let promises: Promise<any>[] = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(redis.set(key, key));
  }
  await Promise.all(promises);
  promises = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(redis.get(key));
  }
  const [a, b, c] = await Promise.all(promises);
  assertEquals(a, "a");
  assertEquals(b, "b");
  assertEquals(c, "c");
});

[Infinity, NaN, "", "port"].forEach(v => {
  test(`invalid port: ${v}`, () => {
    assertThrowsAsync(
      async () => {
        await connect({ hostname: "127.0.0.1", port: v });
      },
      Error,
      "invalid"
    );
  });
});

runIfMain(import.meta);
