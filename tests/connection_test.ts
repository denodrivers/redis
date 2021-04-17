import { connect } from "../mod.ts";
import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("connection");
const port = nextPort();
const server = await startRedis({ port });
const client = await newClient({ hostname: "127.0.0.1", port });

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
  const tempClient = await connect({ hostname: "127.0.0.1", port });
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

suite.runTests();
