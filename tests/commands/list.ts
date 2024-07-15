import { assertEquals } from "../../deps/std/assert.ts";
import {
  afterAll,
  beforeAll,
  beforeEach,
  it,
} from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function listTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const server = getServer();
    client = await connect({ hostname: "127.0.0.1", port: server.port });
  });

  afterAll(() => client.close());

  beforeEach(async () => {
    await client.flushdb();
  });

  it("blpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.blpop(2, "list"), ["list", "1"]);
  });

  it("blpop returns null on timeout", async () => {
    assertEquals(await client.blpop(1, "list"), null);
  });

  it("brpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.brpop(2, "list"), ["list", "2"]);
  });

  it("brpop returns null on timeout", async () => {
    assertEquals(await client.brpop(1, "list"), null);
  });

  it("brpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.brpoplpush("list", "list", 2), "2");
  });

  it("brpoplpush returns null on timeout", async () => {
    assertEquals(await client.brpoplpush("list", "list", 1), null);
  });

  it("lindex", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lindex("list", 0), "1");
    assertEquals(await client.lindex("list", 3), null);
  });

  it("linsert", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.linsert("list", "BEFORE", "2", "1.5"), 3);
  });

  it("llen", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.llen("list"), 2);
  });

  it("lpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpop("list"), "1");
  });

  it("lpos", async () => {
    await client.rpush("list", "a", "b", "c", "1");
    assertEquals(await client.lpos("list", "c"), 2);
    assertEquals(await client.lpos("list", "d"), null);
  });

  it("lpos with rank", async () => {
    await client.rpush("list", "a", "b", "c", "1", "2", "c", "c", "d");
    assertEquals(await client.lpos("list", "c", { rank: 2 }), 5);
  });

  it("lpos with count", async () => {
    await client.rpush("list", "a", "b", "c", "1", "2", "b", "c");
    assertEquals(await client.lpos("list", "b", { count: 2 }), [1, 5]);
  });

  it("lpos with maxlen", async () => {
    await client.rpush("list", "a", "b", "c");
    assertEquals(await client.lpos("list", "c", { maxlen: 2 }), null);
    assertEquals(await client.lpos("list", "c", { maxlen: 3 }), 2);
  });

  it("lpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpush("list", "3", "4"), 4);
  });

  it("lpushx", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lpushx("list", "3"), 3);
  });

  it("lrange", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lrange("list", 0, -1), ["1", "2"]);
  });

  it("lrem", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lrem("list", 0, "1"), 1);
  });

  it("lset", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.lset("list", 0, "0"), "OK");
  });

  it("ltrim", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.ltrim("list", 0, 1), "OK");
  });

  it("rpop", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpop("list"), "2");
  });

  it("rpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpoplpush("list", "list"), "2");
  });

  it("rpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpush("list", "3"), 3);
  });

  it("rpoplpush", async () => {
    await client.rpush("list", "1", "2");
    assertEquals(await client.rpushx("list", "3"), 3);
  });
}
