import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "./vendor/https/deno.land/std/testing/asserts.ts";
import { delay } from "./vendor/https/deno.land/std/async/mod.ts";
import { startRedisServer } from "./tests/test_util.ts";

import { connect } from "./redis.ts";
const { test } = Deno;
const addr = {
  hostname: "127.0.0.1",
  port: 6379,
};

test({
  name: "testSubscribe",
  async fn() {
    const redis = await connect(addr);
    const sub = await redis.subscribe("subsc");
    await sub.unsubscribe("subsc");
    await sub.close();
    assertEquals(sub.isClosed, true);
    redis.close();
  },
});

test({
  name: "testSubscribe2",
  async fn() {
    const redis = await connect(addr);
    const pub = await connect(addr);
    const sub = await redis.subscribe("subsc2");
    const p = (async function () {
      const it = sub.receive();
      return (await it.next()).value;
    })();
    await pub.publish("subsc2", "wayway");
    const message = await p;
    assertEquals(message, {
      channel: "subsc2",
      message: "wayway",
    });
    await sub.close();
    assertEquals(sub.isClosed, true);
    assertEquals(redis.isClosed, true);
    pub.close();
    await assertThrowsAsync(async () => {
      await redis.get("aaa");
    }, Deno.errors.BadResource);
  },
});

test({
  name: "testSubscribe3",
  async fn() {
    const redis = await connect(addr);
    const pub = await connect(addr);
    const sub = await redis.psubscribe("ps*");
    let message1;
    let message2;
    const it = sub.receive();
    const p = (async function () {
      message1 = (await it.next()).value;
      message2 = (await it.next()).value;
    })();
    await pub.publish("psub", "wayway");
    await pub.publish("psubs", "heyhey");
    await p;
    assertEquals(message1, {
      pattern: "ps*",
      channel: "psub",
      message: "wayway",
    });
    assertEquals(message2, {
      pattern: "ps*",
      channel: "psubs",
      message: "heyhey",
    });
    await sub.close();
    pub.close();
    redis.close();
  },
});

test({
  name: "testSubscribe4",
  async fn(): Promise<void> {
    const port = 6464;
    let server = await startRedisServer({ port });
    const redis = await connect({
      ...addr,
      name: "Main",
      port,
    });
    const pub = await connect({
      ...addr,
      maxRetryCount: 10,
      name: "Publisher",
      port,
    });
    const sub = await redis.psubscribe("ps*");
    const it = sub.receive();

    const messages: Promise<number>[] = [];

    const interval = setInterval(() => {
      messages.push(pub.publish("psub", "wayway"));
    }, 900);

    setTimeout(() => server.close(), 1000);

    setTimeout(async () => {
      assertEquals(
        redis.isConnected,
        false,
        "The main client still thinks it is connected."
      );
      assertEquals(
        pub.isConnected,
        false,
        "The publisher client still thinks it is connected."
      );
      assert(messages.length < 5, "Too many messages were published.");

      server = await startRedisServer({ port });

      const tempRedis = await connect({ ...addr, port });
      await tempRedis.ping();
      tempRedis.close();

      await delay(1000);

      assert(redis.isConnected, "The main client is not connected.");
      assert(pub.isConnected, "The publisher client is not connected.");
    }, 2000);

    // Block until all resolve
    await Promise.all([it.next(), it.next(), it.next(), it.next(), it.next()]);

    // Cleanup
    clearInterval(interval);
    server.close();
    pub.close();
    redis.close();
  },
});
