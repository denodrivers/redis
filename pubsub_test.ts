import { assertEquals } from "./vendor/https/deno.land/std/testing/asserts.ts";
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
