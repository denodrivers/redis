import { connect } from "../redis.ts";
import {
  assertEquals,
  assertThrowsAsync
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client, opts } = await makeTest("general");
test("conccurent", async function testConcurrent() {
  let promises: Promise<any>[] = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(client.set(key, key));
  }
  await Promise.all(promises);
  promises = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(client.get(key));
  }
  const [a, b, c] = await Promise.all(promises);
  assertEquals(a, "a");
  assertEquals(b, "b");
  assertEquals(c, "c");
});

test("db0", async function testDb0Option() {
  const key = "exists";
  await client.set(key, "aaa");
  const exists1 = await client.exists(key);
  assertEquals(exists1, 1);
  const client2 = await connect({ ...opts, db: 0 });
  const exists2 = await client2.exists(key);
  assertEquals(exists2, 1);
});

test("exists", async function testDb1Option() {
  const key = "exists";
  const client1 = await connect({ ...opts, db: 0 });
  await client.set(key, "aaa");
  const exists1 = await client1.exists(key);
  assertEquals(exists1, 1);
  const client2 = await connect({ ...opts, db: 1 });
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

test("execRawReply", async () => {
  assertEquals(
    await client.executor.exec("SET", "key", "a"),
    ["status", "OK"]
  );
  assertEquals(await client.executor.exec("GET", "key"), ["bulk", "a"]);
});
