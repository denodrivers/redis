import { delay } from "../../vendor/https/deno.land/std/async/delay.ts";
import {
  assert,
  assertEquals,
  assertRejects,
} from "../../vendor/https/deno.land/std/assert/mod.ts";
import { describe, it } from "../../vendor/https/deno.land/std/testing/bdd.ts";
import { nextPort, startRedis, stopRedis } from "../test_util.ts";
import type { Connector, TestServer } from "../test_util.ts";

export function pubsubTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  const getOpts = () => ({ hostname: "127.0.0.1", port: getServer().port });

  it("subscribe() & unsubscribe()", async () => {
    const opts = getOpts();
    const client = await connect(opts);
    const sub = await client.subscribe("subsc");
    await sub.unsubscribe("subsc");
    sub.close();
    assertEquals(sub.isClosed, true);
    client.close();
  });

  it("receive()", async () => {
    const opts = getOpts();
    const client = await connect(opts);
    const pub = await connect(opts);
    const sub = await client.subscribe("subsc2");
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
    sub.close();
    assertEquals(sub.isClosed, true);
    assertEquals(client.isClosed, true);
    pub.close();
    await assertRejects(async () => {
      await client.get("aaa");
    }, Deno.errors.BadResource);
  });

  describe("receiveBuffers", () => {
    it("returns messages as Uint8Array", async () => {
      const opts = getOpts();
      const client = await connect(opts);
      const pub = await connect(opts);
      const sub = await client.subscribe("subsc3");
      const p = (async () => {
        const it = sub.receiveBuffers();
        return (await it.next()).value;
      })();
      try {
        await pub.publish("subsc3", "foobar");
        const message = await p;
        assertEquals(message, {
          channel: "subsc3",
          message: new TextEncoder().encode("foobar"),
        });
      } finally {
        sub.close();
        pub.close();
      }
      assert(sub.isClosed);
      assert(client.isClosed);
    });
  });

  it("psubscribe()", async () => {
    const opts = getOpts();
    const client = await connect(opts);
    const pub = await connect(opts);
    const sub = await client.psubscribe("ps*");
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
    sub.close();
    pub.close();
    client.close();
  });

  it("retry", async () => {
    const opts = getOpts();
    const port = nextPort();
    let tempServer = await startRedis({ port });
    const subscriberClient = await connect({ ...opts, port });
    const backoff = () => 1200;
    const publisher = await connect({
      ...opts,
      backoff,
      maxRetryCount: 10,
      port,
    });
    const subscription = await subscriberClient.psubscribe("ps*");
    const it = subscription.receive();

    let messages = 0;

    const interval = setInterval(async () => {
      await publisher.publish("psub", "wayway");
      messages++;
    }, 900);

    setTimeout(() => stopRedis(tempServer), 1000);

    const { promise, resolve, reject } = Promise.withResolvers<void>();
    setTimeout(async () => {
      try {
        assertEquals(
          subscriberClient.isConnected,
          false,
          "The subscriber client still thinks it is connected.",
        );
        assertEquals(
          publisher.isConnected,
          false,
          "The publisher client still thinks it is connected.",
        );
        assert(messages < 5, "Too many messages were published.");

        tempServer = await startRedis({ port });

        const tempClient = await connect({ ...opts, port });
        await tempClient.ping();
        tempClient.close();

        await delay(1000);

        assert(
          subscriberClient.isConnected,
          "The subscriber client is not connected.",
        );
        assert(publisher.isConnected, "The publisher client is not connected.");

        resolve();
      } catch (error) {
        reject(error);
      }
    }, 2000);

    // Block until all resolve
    await Promise.all([it.next(), it.next(), it.next(), it.next(), it.next()]);

    // Cleanup
    clearInterval(interval);
    subscription.close();
    publisher.close();
    subscriberClient.close();
    await stopRedis(tempServer);
    await promise;
  });

  it({
    ignore: true,
    name:
      "SubscriptionShouldNotThrowBadResourceErrorWhenConnectionIsClosed (#89)",
    fn: async () => {
      const opts = getOpts();
      const redis = await connect(opts);
      const sub = await redis.subscribe("test");
      const subscriptionPromise = (async () => {
        // deno-lint-ignore no-empty
        for await (const _ of sub.receive()) {}
      })();
      redis.close();
      await subscriptionPromise;
      assert(sub.isClosed);
    },
  });

  it("pubsubNumsub()", async () => {
    const opts = getOpts();
    const subClient1 = await connect(opts);
    await subClient1.subscribe("test1", "test2");

    const subClient2 = await connect(opts);
    await subClient2.subscribe("test2", "test3");

    const pubClient = await connect(opts);
    const resp = await pubClient.pubsubNumsub("test1", "test2", "test3");
    assertEquals(resp, ["test1", 1, "test2", 2, "test3", 1]);

    subClient1.close();
    subClient2.close();
    pubClient.close();
  });

  it("supports calling `subscribe()` multiple times", async () => {
    // https://github.com/denodrivers/redis/issues/390
    const opts = getOpts();
    const redis = await connect(opts);
    const pub = await connect(opts);
    const channel1 = "foo";
    const channel2 = "bar";

    // First subscription
    const sub1 = await redis.subscribe(channel1);
    const it1 = sub1.receive();
    const promise1 = it1.next();
    try {
      // Second subscription
      const sub2 = await redis.subscribe(channel2);
      try {
        const message = "A";
        await pub.publish(channel1, message);
        const result = await promise1;
        assert(!result.done);
        assertEquals(result.value, { channel: channel1, message });

        const it2 = sub2.receive();
        const promise2 = it2.next();
        const message2 = "B";
        await pub.publish(channel2, message2);
        const result2 = await promise2;
        assert(!result2.done);
        assertEquals(result2.value, {
          channel: channel2,
          message: message2,
        });
      } finally {
        sub2.close();
      }
    } finally {
      pub.close();
      sub1.close();
      redis.close();
    }
  });
}
