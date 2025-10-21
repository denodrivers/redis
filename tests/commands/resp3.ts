import {
  assert,
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

  it("returns a double reply as a string", async () => {
    client.zadd("key", { one: 123, two: 2 });
    assertEquals(await client.zscore("key", "one"), "123");
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

  it("returns a boolean reply as 0 or 1", async () => {
    {
      const reply = await client.eval("redis.setresp(3); return true", [], []);
      assertStrictEquals(reply, 1);
    }

    {
      const reply = await client.eval("redis.setresp(3); return false", [], []);
      assertStrictEquals(reply, 0);
    }
  });

  it("supports a verbatim string", async () => {
    const reply = await client.latencyDoctor();
    assertStrictEquals(typeof reply, "string");
    assert(reply.startsWith("txt:"), `"${reply}" should start with "txt:"`);
  });

  // deno-lint-ignore deno-lint-plugin-extra-rules/no-disabled-tests -- TODO: Currently, there is no command that returns a big number.
  it.skip("supports a big number", () => {});
}
