import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("key", async (t) => {
  const port = nextPort();
  const server = await startRedis({ port });
  const client = await newClient({ hostname: "127.0.0.1", port });

  function cleanup(): void {
    stopRedis(server);
    client.close();
  }

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    await t.step(name, async () => {
      await client.flushdb();
      await fn();
    });
  }

  await run("del", async () => {
    let s = await client.set("key1", "fuga");
    assertEquals(s, "OK");
    s = await client.set("key2", "fugaaa");
    assertEquals(s, "OK");
    const deleted = await client.del("key1", "key2");
    assertEquals(deleted, 2);
  });

  await run("dump and restore", async () => {
    await client.set("key", "hello");
    const v = await client.dump("key");
    await client.del("key");
    await client.restore("key", 2000, v!);
    assertEquals(await client.get("key"), "hello");
  });

  await run("exists", async () => {
    const none = await client.exists("none", "none2");
    assertEquals(none, 0);
    await client.set("exists", "aaa");
    const exists = await client.exists("exists", "none");
    assertEquals(exists, 1);
  });

  await run("expire", async () => {
    await client.set("key", "foo");
    const v = await client.expire("key", 1);
    assertEquals(v, 1);
  });

  await run("expireat", async () => {
    await client.set("key", "bar");
    const timestamp = String(new Date(8640000000000000).getTime() / 1000);
    const v = await client.expireat("key", timestamp);
    assertEquals(v, 1);
  });

  await run("keys", async () => {
    await client.set("key1", "foo");
    await client.set("key2", "bar");
    const v = await client.keys("key*");
    assertEquals(v.sort(), ["key1", "key2"]);
  });

  await run("migrate", async () => {
    const v = await client.migrate("127.0.0.1", port, "nosuchkey", "0", 0);
    assertEquals(v, "NOKEY");
  });

  await run("move", async () => {
    const v = await client.move("nosuchkey", "1");
    assertEquals(v, 0);
  });

  await run("object refcount", async () => {
    await client.set("key", "hello");
    const v = await client.objectRefCount("key");
    assertEquals(v, 1);
  });

  await run("object encoding", async () => {
    await client.set("key", "foobar");
    const v = await client.objectEncoding("key");
    assertEquals(typeof v, "string");
  });

  await run("object idletime", async () => {
    await client.set("key", "baz");
    const v = await client.objectIdletime("key");
    assertEquals(v, 0);
  });

  await run("object freq", async () => {
    const v = await client.objectFreq("nosuchkey");
    assertEquals(v, undefined);
  });

  await run("object help", async () => {
    const v = await client.objectHelp();
    assert(Array.isArray(v));
  });

  await run("persist", async () => {
    const v = await client.persist("nosuckey");
    assertEquals(v, 0);
  });

  await run("pexpire", async () => {
    await client.set("key", "hello");
    const v = await client.pexpire("key", 500);
    assertEquals(v, 1);
  });

  await run("pexpireat", async () => {
    await client.set("key", "bar");
    const timestamp = new Date(8640000000000000).getTime();
    const v = await client.pexpireat("key", timestamp);
    assertEquals(v, 1);
  });

  await run("pttl", async () => {
    await client.set("key", "foo");
    const v = await client.pttl("key");
    assertEquals(v, -1);
  });

  await run("randomkey", async () => {
    await client.set("key", "hello");
    const v = await client.randomkey();
    assertEquals(typeof v, "string");
  });

  await run("rename", async () => {
    await client.set("key", "foo");
    const v = await client.rename("key", "newkey");
    assertEquals(v, "OK");
  });

  await run("renamenx", async () => {
    await client.set("key", "bar");
    const v = await client.renamenx("key", "newkey");
    assertEquals(v, 1);
  });

  await run("sort", async () => {
    await client.rpush("key", "3", "10", "5", "1");
    const v = await client.sort("key");
    assertEquals(v, ["1", "3", "5", "10"]);
  });

  await run("touch", async () => {
    await client.set("key1", "baz");
    await client.set("key2", "qux");
    const v = await client.touch("key1", "key2");
    assertEquals(v, 2);
  });

  await run("ttl", async () => {
    await client.set("key", "foo");
    const v = await client.ttl("key");
    assertEquals(v, -1);
  });

  await run("type", async () => {
    await client.set("key", "foobar");
    const v = await client.type("key");
    assertEquals(v, "string");
  });

  await run("unlink", async () => {
    await client.set("key1", "hello");
    await client.set("key2", "world");
    const v = await client.unlink("key1", "key2", "nosuchkey");
    assertEquals(v, 2);
  });

  await run("wait", async () => {
    await client.set("key", "hello");
    const v = await client.wait(0, 1000);
    assertEquals(v, 0);
  });

  await run("scan", async () => {
    await client.set("key1", "foo");
    await client.set("key2", "bar");
    const v = await client.scan(0);
    assertEquals(v.length, 2);
    assertEquals(v[0], "0");
    assertEquals(v[1].length, 2);
    assertArrayIncludes(v[1], ["key1", "key2"]);
  });

  await run("scan with pattern", async () => {
    await client.set("foo", "f");
    await client.set("bar", "b");
    const v = await client.scan(0, { pattern: "f*" });
    assertEquals(v, ["0", ["foo"]]);
  });

  cleanup();
});
