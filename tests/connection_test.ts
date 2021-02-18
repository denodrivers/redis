import { connect } from "../mod.ts";
import {
  assertEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("connection");
const server = await startRedis({ port: 7003 });
const client = await newClient({ hostname: "127.0.0.1", port: 7003 });

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
  const tempClient = await connect({ hostname: "127.0.0.1", port: 7003 });
  assertEquals(tempClient.isConnected, true);
  assertEquals(tempClient.isClosed, false);
  assertEquals(await tempClient.quit(), "OK");
  assertEquals(tempClient.isConnected, false);
  assertEquals(tempClient.isClosed, true);
});

suite.test("select", async () => {
  assertEquals(await client.select(1), "OK");
});

suite.test("swapdb", async () => {
  assertEquals(await client.swapdb(0, 1), "OK");
});

suite.test("client id", async () => {
  const id = await client.clientID();
  assertEquals(typeof id, "number");
});

suite.test("client setname & getname", async () => {
  assertEquals(await client.clientSetName("deno-redis"), "OK");
  assertEquals(await client.clientGetName(), "deno-redis");
});

suite.test("client pause", async () => {
  assertEquals(await client.clientPause(10), "OK");
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

suite.runTests();
