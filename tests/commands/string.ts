import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function stringTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const client = await newClient({ hostname: "127.0.0.1", port: server.port });
  function cleanup(): void {
    client.close();
  }

  async function run(name: string, fn: () => Promise<void>): Promise<void> {
    await t.step(name, async () => {
      await client.flushdb();
      await fn();
    });
  }

  await run("append", async () => {
    await client.set("key", "foo");
    const rep = await client.append("key", "bar");
    assertEquals(rep, 6);
    const v = await client.get("key");
    assertEquals(v, "foobar");
  });

  await run("bitcount", async () => {
    await client.set("key", "foo"); // 01100110 01101111 01101111
    const v = await client.bitcount("key");
    assertEquals(v, 16);
  });

  await run("bitfieldWithoutOperations", async () => {
    await client.set("key", "test");
    const v = await client.bitfield("key");
    assertEquals(v, []);
  });

  await run("bitfield with opts", async () => {
    await client.set("key", "4660");
    const v = await client.bitfield("key", {
      get: { type: "u8", offset: 0 },
      set: { type: "i5", offset: 1, value: 0 },
      incrby: { type: "u16", offset: 2, increment: 2 },
    });
    assertEquals(v, [52, 13, 218]);
  });

  await run("bitfield with overflow", async () => {
    const v = await client.bitfield("key", {
      overflow: "FAIL",
    });
    assertEquals(v, []);
  });

  await run("bitop", async () => {
    await client.set("key1", "foo"); // 01100110 01101111 01101111
    await client.set("key2", "bar"); // 01100010 01100001 01110010
    await client.bitop("AND", "dest", "key1", "key2");
    const v = await client.get("dest");
    assertEquals(v, "bab"); // 01100010 01100001 01100000
  });

  await run("bitpos", async () => {
    await client.set("key", "2"); // 00110010
    assertEquals(await client.bitpos("key", 0), 0);
    assertEquals(await client.bitpos("key", 1), 2);
  });

  await run("decr", async () => {
    const rep = await client.decr("key");
    assertEquals(rep, -1);
    assertEquals(await client.get("key"), "-1");
  });

  await run("decby", async () => {
    const rep = await client.decrby("key", 101);
    assertEquals(rep, -101);
    assertEquals(await client.get("key"), "-101");
  });

  await run("getWhenNil", async () => {
    const hoge = await client.get("none");
    assertEquals(hoge, undefined);
  });

  await run("getbit", async () => {
    await client.set("key", "3"); // 00110011
    assertEquals(await client.getbit("key", 0), 0);
    assertEquals(await client.getbit("key", 2), 1);
  });

  await run("getrange", async () => {
    await client.set("key", "Hello world!");
    const v = await client.getrange("key", 6, 10);
    assertEquals(v, "world");
  });

  await run("getset", async function testGetSet() {
    await client.set("key", "val");
    const v = await client.getset("key", "lav");
    assertEquals(v, "val");
    assertEquals(await client.get("key"), "lav");
  });

  await run("incr", async () => {
    const rep = await client.incr("key");
    assertEquals(rep, 1);
    assertEquals(await client.get("key"), "1");
  });

  await run("incrby", async () => {
    const rep = await client.incrby("key", 101);
    assertEquals(rep, 101);
    assertEquals(await client.get("key"), "101");
  });

  await run("incrbyfloat", async () => {
    await client.set("key", "2.1");
    const v = await client.incrbyfloat("key", 0.5);
    assertEquals(v, "2.6");
    assertEquals(await client.get("key"), "2.6");
  });

  await run("mget", async () => {
    await client.set("key1", "val1");
    await client.set("key2", "val2");
    await client.set("key3", "val3");
    const v = await client.mget("key1", "key2", "key3");
    assertEquals(v, ["val1", "val2", "val3"]);
  });

  await run("mset", async () => {
    let rep = await client.mset("key1", "foo");
    assertEquals(rep, "OK");
    rep = await client.mset({ key2: "bar", key3: "baz" });
    assertEquals(rep, "OK");
    rep = await client.mset(["key4", "bar"], ["key5", "baz"]);
    assertEquals(rep, "OK");
    assertEquals(await client.get("key1"), "foo");
    assertEquals(await client.get("key2"), "bar");
    assertEquals(await client.get("key3"), "baz");
  });

  await run("msetnx", async () => {
    let rep1 = await client.msetnx("key1", "foo");
    assertEquals(rep1, 1); // All the keys were set.
    rep1 = await client.msetnx({ key2: "bar" });
    assertEquals(rep1, 1); // All the keys were set.
    rep1 = await client.msetnx(["key4", "bar"], ["key5", "baz"]);
    assertEquals(rep1, 1);
    const rep2 = await client.msetnx({ key2: "baz", key3: "qux" });
    assertEquals(rep2, 0); // No key was set.
    assertEquals(await client.get("key1"), "foo");
    assertEquals(await client.get("key2"), "bar");
    assertEquals(await client.get("key3"), undefined);
  });

  await run("psetex", async () => {
    const rep = await client.psetex("key1", 1000, "test");
    assertEquals(rep, "OK");
    assertEquals(await client.get("key1"), "test");
  });

  await run("set", async () => {
    const s = await client.set("key", "fuga你好こんにちは");
    assertEquals(s, "OK");
    const fuga = await client.get("key");
    assertEquals(fuga, "fuga你好こんにちは");
  });

  await run("set Number", async () => {
    const s = await client.set("key", 123);
    assertEquals(s, "OK");
    const v = await client.get("key");
    assertEquals(v, "123");
  });

  await run("setbit", async () => {
    await client.set("key", "2"); // 00110010
    assertEquals(
      0,
      await client.setbit("key", 1, "1"), // 01110010
    );
    assertEquals(
      1,
      await client.setbit("key", 3, "0"), // 01100010 => b
    );
    const v = await client.get("key");
    assertEquals(v, "b");
  });

  await run("setex", async () => {
    const rep = await client.setex("key", 1, "test");
    assertEquals(rep, "OK");
    assertEquals(await client.get("key"), "test");
  });

  await run("setnx", async () => {
    assertEquals(await client.setnx("key", "foo"), 1);
    assertEquals(await client.setnx("key", "bar"), 0);
    const v = await client.get("key");
    assertEquals(v, "foo");
  });

  await run("setrange", async () => {
    await client.set("key", "Hello, Deno!");
    const rep = await client.setrange("key", 7, "Redis!");
    assertEquals(rep, 13);
    const v = await client.get("key");
    assertEquals(v, "Hello, Redis!");
  });

  await run("stralgo", async () => {
    await client.set("a", "Hello");
    await client.set("b", "Deno!");
    const matches = [[[4, 4], [3, 3]], [[1, 1], [1, 1]]];
    const matchesWithLen = [[[4, 4], [3, 3], 1], [[1, 1], [1, 1], 1]];
    assertEquals(await client.stralgo("LCS", "KEYS", "a", "b"), "eo");
    assertEquals(
      await client.stralgo("LCS", "KEYS", "a", "b", { len: true }),
      2,
    );
    assertEquals(
      await client.stralgo("LCS", "KEYS", "a", "b", { idx: true }),
      ["matches", matches, "len", 2],
    );
    assertEquals(
      await client.stralgo(
        "LCS",
        "KEYS",
        "a",
        "b",
        { idx: true, withmatchlen: true },
      ),
      ["matches", matchesWithLen, "len", 2],
    );
    assertEquals(
      await client.stralgo(
        "LCS",
        "KEYS",
        "a",
        "b",
        { idx: true, minmatchlen: 2 },
      ),
      ["matches", [], "len", 2],
    );
    assertEquals(
      await client.stralgo("LCS", "STRINGS", "Hello", "Deno!"),
      "eo",
    );
    assertEquals(
      await client.stralgo("LCS", "STRINGS", "Hello", "Deno!", { len: true }),
      2,
    );
  });

  await run("strlen", async () => {
    await client.set("key", "foobar");
    const v = await client.strlen("key");
    assertEquals(v, 6);
  });

  cleanup();
}
