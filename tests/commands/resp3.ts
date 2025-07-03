import {
  assertArrayIncludes,
  assertEquals,
  assertStrictEquals,
} from "../../deps/std/assert.ts";
import { afterAll, beforeAll, beforeEach, it } from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";
import { kUnstableProtover } from "../../internal/symbols.ts";

export function resp3Tests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const server = getServer();
    client = await connect({
      hostname: "127.0.0.1",
      port: server.port,
      [kUnstableProtover]: 3,
    });
  });

  afterAll(() => client.close());
  beforeEach(async () => {
    await client.flushdb();
  });

  it("returns a map reply as an array", async () => {
    await client.hset("key", "foo", "1");
    await client.hset("key", "bar", "2");
    assertEquals(await client.hgetall("key"), ["foo", "1", "bar", "2"]);
  });

  it("returns a set reply as an array", async () => {
    await client.sadd("key", "foo", "1");
    const reply = await client.smembers("key");
    assertArrayIncludes(reply, ["foo", "1"]);
    assertEquals(reply.length, 2);
  });

  it("returns a null reply as `null`", async () => {
    const reply = await client.get("no-such-key");
    assertStrictEquals(reply, null);
  });
}
