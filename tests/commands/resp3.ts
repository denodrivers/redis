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
  _connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  const connect = () =>
    _connect({
      hostname: "127.0.0.1",
      port: getServer().port,
      [kUnstableProtover]: 3,
    });
  beforeAll(async () => {
    client = await connect();
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

  it("supports a push reply", async () => {
    using client = await connect();
    const channel = "testing";
    const sub = await client.subscribe(channel);
    const it = sub.receive();
    const payload = "foobar";
    await client.publish(channel, payload);
    const result = await it.next();
    assert(!result.done);
    assertEquals(result.value, { channel, message: payload });
  });

  it("supports executing regular commands in a push-mode connection", async () => {
    using client = await connect();
    const channel = "testing";
    const sub = await client.subscribe(channel);
    const it = sub.receive();
    const messageToPublish = "foobar";
    const message1 = "bar";
    const message2 = "baz";

    const echoPromise = client.echo(message1);
    const publishPromise = client.publish(channel, messageToPublish);
    const echoPromise2 = client.echo(message2);
    await publishPromise;

    const result = await it.next();
    assert(!result.done);
    assertEquals(result.value, { channel, message: messageToPublish });

    // Replies to regular commands should be returned successfully.
    assertEquals(await echoPromise, message1);
    assertEquals(await echoPromise2, message2);
  });

  it("supports a pipeline in a push-mode connection", async () => {
    using client = await connect();
    const channel = "testing";
    const sub = await client.subscribe(channel);
    const it = sub.receive();

    const pipeline = client.pipeline();
    pipeline.set("foo", "123");
    pipeline.get("foo");
    const pipelinePromise = pipeline.flush();

    const message = "Hello, World!";
    await client.publish(channel, message);
    await pipelinePromise;

    const result = await it.next();
    assert(!result.done);
    assertEquals(result.value, { channel, message: message });

    // Replies to regular commands should be returned successfully.
    const replies = await pipelinePromise;
    assertEquals(replies, ["OK", "123"]);
  });

  // deno-lint-ignore deno-lint-plugin-extra-rules/no-disabled-tests -- TODO: Currently, there is no command that returns a big number.
  it.skip("supports a big number", () => {});

  // deno-lint-ignore deno-lint-plugin-extra-rules/no-disabled-tests -- TODO: Currently, there doesn't seem to be any command that returns a blob error.
  it.skip("supports a blob error", () => {});
}
