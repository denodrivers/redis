import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("pubsub");
const server = await startRedis({ port: 7015 });
const opts = { hostname: "127.0.0.1", port: 7015 };

suite.afterAll(() => {
  stopRedis(server);
});

suite.test("testSubscribe", async () => {
  const client = await newClient(opts);
  const sub = await client.subscribe("subsc");
  await sub.unsubscribe("subsc");
  await sub.close();
  assertEquals(sub.isClosed, true);
  client.close();
});

suite.test("testSubscribe2", async () => {
  const client = await newClient(opts);
  const pub = await newClient(opts);
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
  await sub.close();
  assertEquals(sub.isClosed, true);
  assertEquals(client.isClosed, true);
  pub.close();
  await assertThrowsAsync(async () => {
    await client.get("aaa");
  }, Deno.errors.BadResource);
});

suite.test("testSubscribe3", async () => {
  const client = await newClient(opts);
  const pub = await newClient(opts);
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
  await sub.close();
  pub.close();
  client.close();
});

suite.test("testSubscribe4", async () => {
  const port = 7016;
  let tempServer = await startRedis({ port });
  const client = await newClient({ ...opts, port });
  const pub = await newClient({ ...opts, maxRetryCount: 10, port });
  const sub = await client.psubscribe("ps*");
  const it = sub.receive();

  let messages = 0;

  const interval = setInterval(async () => {
    await pub.publish("psub", "wayway");
    messages++;
  }, 900);

  setTimeout(() => stopRedis(tempServer), 1000);

  setTimeout(async () => {
    assertEquals(
      client.isConnected,
      false,
      "The main client still thinks it is connected.",
    );
    assertEquals(
      pub.isConnected,
      false,
      "The publisher client still thinks it is connected.",
    );
    assert(messages < 5, "Too many messages were published.");

    tempServer = await startRedis({ port });

    const tempClient = await newClient({ ...opts, port });
    await tempClient.ping();
    tempClient.close();

    await delay(1000);

    assert(client.isConnected, "The main client is not connected.");
    assert(pub.isConnected, "The publisher client is not connected.");
  }, 2000);

  // Block until all resolve
  await Promise.all([it.next(), it.next(), it.next(), it.next(), it.next()]);

  // Cleanup
  clearInterval(interval);
  await sub.close();
  pub.close();
  client.close();
  stopRedis(tempServer);
});

await suite.runTests();
