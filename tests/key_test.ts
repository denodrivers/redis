import {
  assertEquals,
  assert,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client } = await makeTest("key");

test("del", async () => {
  let s = await client.set("key1", "fuga");
  assertEquals(s, "OK");
  s = await client.set("key2", "fugaaa");
  assertEquals(s, "OK");
  const deleted = await client.del("key1", "key2");
  assertEquals(deleted, 2);
});

/* TODO This test fails currently.
test("dump and restore", async () => {
  await client.set("key", "hello");
  const v = await client.dump("key");
  await client.del("key");
  await client.restore("key", 2000, v!);
});
*/

test("exists", async () => {
  const none = await client.exists("none", "none2");
  assertEquals(none, 0);
  await client.set("exists", "aaa");
  const exists = await client.exists("exists", "none");
  assertEquals(exists, 1);
});

test("expire", async () => {
  await client.set("key", "foo");
  const v = await client.expire("key", 1);
  assertEquals(v, 1);
});

test("expireat", async () => {
  await client.set("key", "bar");
  const timestamp = String(new Date(8640000000000000).getTime() / 1000);
  const v = await client.expireat("key", timestamp);
  assertEquals(v, 1);
});

test("keys", async () => {
  await client.set("key1", "foo");
  await client.set("key2", "bar");
  const v = await client.keys("key*");
  assertEquals(v.sort(), ["key1", "key2"]);
});

test("migrate", async () => {
  const v = await client.migrate("127.0.0.1", 6379, "nosuchkey", "0", 0);
  assertEquals(v, "NOKEY");
});

test("move", async () => {
  const v = await client.move("nosuchkey", "1");
  assertEquals(v, 0);
});

test("object refcount", async () => {
  await client.set("key", "hello");
  const v = await client.object_refcount("key");
  assertEquals(v, 1);
});

test("object encoding", async () => {
  await client.set("key", "foobar");
  const v = await client.object_encoding("key");
  assertEquals(typeof v, "string");
});

test("object idletime", async () => {
  await client.set("key", "baz");
  const v = await client.object_ideltime("key");
  assertEquals(v, 0);
});

test("object freq", async () => {
  const v = await client.object_freq("nosuchkey");
  assertEquals(v, undefined);
});

test("object help", async () => {
  const v = await client.object_help();
  assert(Array.isArray(v));
});

test("persist", async () => {
  const v = await client.persist("nosuckey");
  assertEquals(v, 0);
});

test("pexpire", async () => {
  await client.set("key", "hello");
  const v = await client.pexpire("key", 500);
  assertEquals(v, 1);
});

test("pexpireat", async () => {
  await client.set("key", "bar");
  const timestamp = new Date(8640000000000000).getTime();
  const v = await client.pexpireat("key", timestamp);
  assertEquals(v, 1);
});

test("pttl", async () => {
  await client.set("key", "foo");
  const v = await client.pttl("key");
  assertEquals(v, -1);
});

test("randomkey", async () => {
  await client.set("key", "hello");
  const v = await client.randomkey();
  assertEquals(typeof v, "string");
});

test("rename", async () => {
  await client.set("key", "foo");
  const v = await client.rename("key", "newkey");
  assertEquals(v, "OK");
});

test("renamenx", async () => {
  await client.set("key", "bar");
  const v = await client.renamenx("key", "newkey");
  assertEquals(v, 1);
});

test("sort", async () => {
  await client.rpush("key", "3", "10", "5", "1");
  const v = await client.sort("key");
  assertEquals(v, ["1", "3", "5", "10"]);
});

test("touch", async () => {
  await client.set("key1", "baz");
  await client.set("key2", "qux");
  const v = await client.touch("key1", "key2");
  assertEquals(v, 2);
});

test("ttl", async () => {
  await client.set("key", "foo");
  const v = await client.ttl("key");
  assertEquals(v, -1);
});

test("type", async () => {
  await client.set("key", "foobar");
  const v = await client.type("key");
  assertEquals(v, "string");
});

test("unlink", async () => {
  await client.set("key1", "hello");
  await client.set("key2", "world");
  const v = await client.unlink("key1", "key2", "nosuchkey");
  assertEquals(v, 2);
});

test("wait", async () => {
  await client.set("key", "hello");
  const v = await client.wait(0, 1000);
  assertEquals(v, 0);
});

test("scan", async () => {
  await client.set("key1", "foo");
  await client.set("key2", "bar");
  assert(Array.isArray(await client.scan(0)));
});
