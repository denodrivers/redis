import { assertEquals } from "./vendor/https/deno.land/std/testing/asserts.ts";
import { delay } from "./vendor/https/deno.land/std/async/mod.ts";

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
    // const hoge = await redis.get("hoge");
    const unsub = await sub.unsubscribe("subsc");
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
    const a = await redis.get("aaa");
    assertEquals(a, undefined);
    pub.close();
    redis.close();
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
  name: "testSubscribe4 (#83)",
  async fn() {
    const throwawayRedisClientPort = 6464;
    const throwawayRedisClientChildProcess = Deno.run(
      {
        cmd: [ "redis-server", "--port", throwawayRedisClientPort.toString() ],
        stdin: "null",
        stdout: "null"
      }
    );

    await delay(500);

    const redisClient = await connect({ ...addr, port: throwawayRedisClientPort });
    const publisherRedisClient = await connect({ ...addr, port: throwawayRedisClientPort });
    const subscriberRedisClient = await redisClient.psubscribe("ps*");

    const messageIterator = subscriberRedisClient.receive();

    try {
      const interval = setInterval(
        () => publisherRedisClient.publish("psub", "wayway"),
        500
      );

      // Force kill the Redis server to cause the error
      setTimeout(() => throwawayRedisClientChildProcess.kill(Deno.Signal.SIGTERM), 900);

      const promiseList = Promise.all([
        messageIterator.next(),
        messageIterator.next(),
        messageIterator.next()
      ]);

      await delay(500 * 3 + 500);

      clearInterval(interval);

      // We received the 3 messages as expected
      await promiseList;

    } finally {
      // Final clean up

      // Ensure that the child process is killed and closed
      try {
        throwawayRedisClientChildProcess.kill(Deno.Signal.SIGTERM);
        throwawayRedisClientChildProcess.close();
      } catch (error) {}

      publisherRedisClient.close();
      redisClient.close();
    }
  },
});
