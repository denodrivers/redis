import { connect, Redis } from "./redis.ts";
import {
  assertEquals,
  assertThrowsAsync,
  assertArrayContains
} from "./vendor/https/deno.land/std/testing/asserts.ts";
const { test } = Deno;

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
    "spopWithCount",
    "zrange",
    "zrangeWithScores",
    "zrevrange",
    "zrevrangeWithScores",
    "zrangebyscore",
    "zrangebyscoreWithScores",
    "zrevrangebyscore",
    "zrevrangebyscoreWithScores"
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

test(async function testZrange() {
  redis.zadd("zrange", 1, "one");
  redis.zadd("zrange", 2, "two");
  redis.zadd("zrange", 3, "three");
  const v = await redis.zrange("zrange", 0, 1);
  assertEquals(v, ["one", "two"]);
});

test(async function testZrangeWithScores() {
  redis.zadd("zrangeWithScores", 1, "one");
  redis.zadd("zrangeWithScores", 2, "two");
  redis.zadd("zrangeWithScores", 3, "three");
  const v = await redis.zrange("zrangeWithScores", 0, 1, { withScore: true });
  assertEquals(v, ["one", "1", "two", "2"]);
});

test(async function testZrevrange() {
  redis.zadd("zrevrange", 1, "one");
  redis.zadd("zrevrange", 2, "two");
  redis.zadd("zrevrange", 3, "three");
  const v = await redis.zrevrange("zrevrange", 0, 1);
  assertEquals(v, ["three", "two"]);
});

test(async function testZrevrangeWithScores() {
  redis.zadd("zrevrangeWithScores", 1, "one");
  redis.zadd("zrevrangeWithScores", 2, "two");
  redis.zadd("zrevrangeWithScores", 3, "three");
  const v = await redis.zrevrange("zrevrangeWithScores", 0, 1, {
    withScore: true
  });
  assertEquals(v, ["three", "3", "two", "2"]);
});

test(async function testZrangebyscore() {
  redis.zadd("zrangebyscore", 2, "m1");
  redis.zadd("zrangebyscore", 5, "m2");
  redis.zadd("zrangebyscore", 8, "m3");
  redis.zadd("zrangebyscore", 10, "m4");
  const v = await redis.zrangebyscore("zrangebyscore", 3, 9);
  assertEquals(v, ["m2", "m3"]);
});

test(async function testZrangebyscoreWithScores() {
  redis.zadd("zrangebyscoreWithScores", 2, "m1");
  redis.zadd("zrangebyscoreWithScores", 5, "m2");
  redis.zadd("zrangebyscoreWithScores", 8, "m3");
  redis.zadd("zrangebyscoreWithScores", 10, "m4");
  const v = await redis.zrangebyscore("zrangebyscoreWithScores", 3, 9, {
    withScore: true
  });
  assertEquals(v, ["m2", "5", "m3", "8"]);
});

test(async function testZrevrangebyscore() {
  redis.zadd("zrevrangebyscore", 2, "m1");
  redis.zadd("zrevrangebyscore", 5, "m2");
  redis.zadd("zrevrangebyscore", 8, "m3");
  redis.zadd("zrevrangebyscore", 10, "m4");
  const v = await redis.zrevrangebyscore("zrevrangebyscore", 9, 4);
  assertEquals(v, ["m3", "m2"]);
});

test(async function testZrevrangebyscore() {
  redis.zadd("zrevrangebyscoreWithScores", 2, "m1");
  redis.zadd("zrevrangebyscoreWithScores", 5, "m2");
  redis.zadd("zrevrangebyscoreWithScores", 8, "m3");
  redis.zadd("zrevrangebyscoreWithScores", 10, "m4");
  const v = await redis.zrevrangebyscore("zrevrangebyscoreWithScores", 9, 4, {
    withScore: true
  });
  assertEquals(v, ["m3", "8", "m2", "5"]);
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

test(async function testDb0Option() {
  const key = "exists";
  await redis.set(key, "aaa");
  const exists1 = await redis.exists(key);
  assertEquals(exists1, 1);
  const client2 = await connect({ ...addr, db: 0 });
  const exists2 = await client2.exists(key);
  assertEquals(exists2, 1);
});

test(async function testDb1Option() {
  const key = "exists";
  await redis.set(key, "aaa");
  const exists1 = await redis.exists(key);
  assertEquals(exists1, 1);
  const client2 = await connect({ ...addr, db: 1 });
  const exists2 = await client2.exists(key);
  assertEquals(exists2, 0);
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

