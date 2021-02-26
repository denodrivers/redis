import { connect, Redis } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import {
  assertEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("connection");
const server = await startRedis({ port: 7003 });
let client: Redis;

suite.beforeEach(async () => {
  client = await newClient({ hostname: "127.0.0.1", port: 7003 });
});

suite.afterEach(() => {
  client.close();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("echo", async () => {
  assertEquals(await client.echo("Hello World"), "Hello World");
});

suite.test("ping", async () => {
  assertEquals(await client.ping(), "PONG");
  assertEquals(await client.ping("Deno"), "Deno");
});

suite.test("quit", async () => {
  assertEquals(client.isConnected, true);
  assertEquals(client.isClosed, false);
  assertEquals(await client.quit(), "OK");
  assertEquals(client.isConnected, false);
  assertEquals(client.isClosed, true);
});

suite.test("select", async () => {
  assertEquals(await client.select(1), "OK");
});

suite.test("swapdb", async () => {
  assertEquals(await client.swapdb(0, 1), "OK");
});

suite.test("client caching with opt in", async () => {
  await client.clientTracking({ mode: "ON", optIn: true });
  assertEquals(await client.clientCaching("YES"), "OK");
});

suite.test("client caching with opt out", async () => {
  await client.clientTracking({ mode: "ON", optOut: true });
  assertEquals(await client.clientCaching("NO"), "OK");
});

suite.test("client caching without opt in or opt out", async () => {
  await assertThrowsAsync(
    () => {
      return client.clientCaching("YES");
    },
    Error,
    "-ERR CLIENT CACHING can be called only when the client is in tracking mode with OPTIN or OPTOUT mode enabled",
  );
});

suite.test("client id", async () => {
  const id = await client.clientID();
  assertEquals(typeof id, "number");
});

suite.test("client setname & getname", async () => {
  assertEquals(await client.clientSetName("deno-redis"), "OK");
  assertEquals(await client.clientGetName(), "deno-redis");
});

suite.test("client getredir with no redirect", async () => {
  assertEquals(await client.clientGetRedir(), -1);
});

suite.test("client getredir with redirect", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port: 7003 });
  try {
    const id = await tempClient.clientID();
    await client.clientTracking({ mode: "ON", redirect: id });
    assertEquals(await client.clientGetRedir(), id);
  } finally {
    tempClient.close();
  }
});

suite.test("client pause", async () => {
  assertEquals(await client.clientPause(10), "OK");
  assertEquals(await client.clientPause(10, "WRITE"), "OK");
  assertEquals(await client.clientPause(10, "ALL"), "OK");
});

suite.test("client tracking", async () => {
  assertEquals(
    await client.clientTracking({
      mode: "ON",
      prefixes: ["foo", "bar"],
      bcast: true,
    }),
    "OK",
  );
  assertEquals(
    await client.clientTracking({
      mode: "ON",
      bcast: true,
      optIn: false,
      noLoop: true,
    }),
    "OK",
  );
  await assertThrowsAsync(
    () => {
      return client.clientTracking({ mode: "ON", bcast: true, optIn: true });
    },
    Error,
    "-ERR OPTIN and OPTOUT are not compatible with BCAST",
  );
});

suite.test("client unblock nothing", async () => {
  const id = await client.clientID();
  assertEquals(await client.clientUnblock(id), 0);
});

suite.test("client unblock with timeout", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port: 7003 });
  try {
    const id = await tempClient.clientID();
    tempClient.brpop(0, "key1"); // Block.
    await delay(5); // Give some leeway for brpop to reach redis.
    assertEquals(await client.clientUnblock(id, "TIMEOUT"), 1);
  } finally {
    tempClient.close();
  }
});

suite.test("client unblock with error", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port: 7003 });
  try {
    const id = await tempClient.clientID();
    assertThrowsAsync(
      () => tempClient.brpop(0, "key1"),
      Error,
      "-UNBLOCKED",
    );
    await delay(5); // Give some leeway for brpop to reach redis.
    assertEquals(await client.clientUnblock(id, "ERROR"), 1);
  } finally {
    tempClient.close();
  }
});

suite.runTests();
