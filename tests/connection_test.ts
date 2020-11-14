import { connect, parseURL } from "../redis.ts";
import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
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

suite.test("parse basic URL", () => {
  const options = parseURL("redis://127.0.0.1:7003");
  assertEquals(options.hostname, "127.0.0.1");
  assertEquals(options.port, 7003);
  assertEquals(options.tls, false);
  assertEquals(options.db, undefined);
  assertEquals(options.name, undefined);
  assertEquals(options.password, undefined);
});

suite.test("parse complex URL", () => {
  const options = parseURL("rediss://username:password@127.0.0.1:7003/1");
  assertEquals(options.hostname, "127.0.0.1");
  assertEquals(options.port, 7003);
  assertEquals(options.tls, true);
  assertEquals(options.db, 1);
  assertEquals(options.name, "username");
  assertEquals(options.password, "password");
});

suite.test("parse URL with search options", () => {
  const options = parseURL(
    "redis://127.0.0.1:7003/?db=2&password=password&ssl=true",
  );
  assertEquals(options.hostname, "127.0.0.1");
  assertEquals(options.port, 7003);
  assertEquals(options.tls, true);
  assertEquals(options.db, 2);
  assertEquals(options.name, undefined);
  assertEquals(options.password, "password");
});

suite.test("Check parameter parsing priority", () => {
  const options = parseURL(
    "rediss://username:password@127.0.0.1:7003/1?db=2&password=password2&ssl=false",
  );
  assertEquals(options.hostname, "127.0.0.1");
  assertEquals(options.port, 7003);
  assertEquals(options.tls, true);
  assertEquals(options.db, 1);
  assertEquals(options.name, "username");
  assertEquals(options.password, "password");
});

suite.runTests();
