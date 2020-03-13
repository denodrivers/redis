import { connect } from "./redis.ts";
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

let redis = await connect({ ...addr, db: 0 });
await redis.flushdb(false);

test(async function testExists() {
  const none = await redis.exists("none", "none2");
  assertEquals(none, 0);
  await redis.set("exists", "aaa");
  const exists = await redis.exists("exists", "none");
  assertEquals(exists, 1);
});

test(async function testDel() {
  let s = await redis.set("del1", "fuga");
  assertEquals(s, "OK");
  s = await redis.set("del2", "fugaaa");
  assertEquals(s, "OK");
  const deleted = await redis.del("del1", "del2");
  assertEquals(deleted, 2);
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
    assertThrowsAsync(async () => {
      await connect({ hostname: "127.0.0.1", port: v });
    }, Error, "invalid");
  });
});

import "./tests/connection_test.ts";
import "./tests/geo_test.ts";
import "./tests/hash_test.ts";
import "./tests/hyper_loglog_test.ts";
import "./tests/list_test.ts";
import "./tests/set_test.ts";
import "./tests/sorted_set_test.ts";
import "./tests/string_test.ts";
