import type { DefaultPubSubMessageType, RedisSubscription } from "../client.ts";
import { createPoolClient } from "../pool/mod.ts";
import { assert, assertEquals } from "../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../deps/std/testing.ts";
import type { TestServer } from "./test_util.ts";
import { nextPort, startRedis, stopRedis } from "./test_util.ts";

describe("createPoolClient", () => {
  let port!: number;
  let server!: TestServer;
  beforeAll(async () => {
    port = nextPort();
    server = await startRedis({ port });
  });
  afterAll(() => stopRedis(server));

  it("supports distributing commands to pooled connections", async () => {
    const client = await createPoolClient({
      connection: {
        hostname: "127.0.0.1",
        port,
      },
    });
    try {
      const blpopPromise = client.blpop(500, "list");
      setTimeout(() => {
        client.lpush("list", "foo");
      }, 100);
      const existsPromise = client.exists("list");
      const replies = await Promise.all([
        blpopPromise,
        existsPromise,
      ]);
      assertEquals(
        replies,
        [["list", "foo"], 0],
        "BLPOP should not block subsequent EXISTS",
      );
    } finally {
      await client.flushdb();
      client.close();
    }
  });

  it("supports Pub/Sub", async () => {
    const client = await createPoolClient({
      connection: {
        hostname: "127.0.0.1",
        port,
      },
    });
    let subscription: RedisSubscription<DefaultPubSubMessageType> | null = null;
    try {
      const channel = "pool_test";
      subscription = await client.subscribe(channel);
      const payload = "foobar";
      await client.publish(channel, payload);
      const iter = subscription.receive();
      const message = await iter.next();
      assert(!message.done);
      assertEquals(message.value, {
        channel,
        message: payload,
      });
    } finally {
      subscription?.close();
      await client.flushdb();
      client.close();
    }
  });
});
