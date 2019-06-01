import { test } from "https://deno.land/std@v0.7.0/testing/mod.ts";
import { assertEquals } from "https://deno.land/std@v0.7.0/testing/asserts.ts";
import { connect } from "./redis.ts";
import { RedisPubSubMessage } from "./pubsub.ts";

const addr = "127.0.0.1:6379";

async function wait(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

test(async function testSubscribe() {
  const redis = await connect(addr);
  const sub = await redis.subscribe("subsc");
  //const hoge = await redis.get("hoge");
  const unsub = await sub.unsubscribe("subsc");
  await sub.close();
  assertEquals(sub.isClosed, true);
  redis.close();
});

test(async function testSubscribe2() {
  const redis = await connect(addr);
  const pub = await connect(addr);
  const sub = await redis.subscribe("subsc2");
  let message: RedisPubSubMessage;
  (async function() {
    const it = sub.receive();
    message = (await it.next()).value;
  })();
  await pub.publish("subsc2", "wayway");
  await sub.close();
  assertEquals(message, {
    channel: "subsc2",
    message: "wayway"
  });
  const a = await redis.get("aaa");
  assertEquals(a, void 0);
  pub.close();
  redis.close();
});

test(async function testPsubscribe() {
  const redis = await connect(addr);
  const pub = await connect(addr);
  const sub = await redis.psubscribe("ps*");
  let message1;
  let message2;
  (async function() {
    const it = sub.receive();
    message1 = (await it.next()).value;
    message2 = (await it.next()).value;
  })();
  await pub.publish("psub", "wayway");
  await pub.publish("psubs", "heyhey");
  await sub.close();
  assertEquals(message1, {
    pattern: "ps*",
    channel: "psub",
    message: "wayway"
  });
  assertEquals(message2, {
    pattern: "ps*",
    channel: "psubs",
    message: "heyhey"
  });
  pub.close();
  redis.close();
});
