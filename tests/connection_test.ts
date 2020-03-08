import { connect } from "../redis.ts";
import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client } = await makeTest("connection");
/** Connection */
test("echo", async () => {
  assertEquals(await client.echo("Hello World"), "Hello World");
});
test("ping", async () => {
  assertEquals(await client.ping(), "PONG");
  assertEquals(await client.ping("Deno"), "Deno");
});
test("quit", async () => {
  const cli = await connect({ hostname: "127.0.0.1", port: 6379 });
  assertEquals(await cli.quit(), "OK");
  assertEquals(cli.isClosed, true);
});
test("select", async () => {
  assertEquals(await client.select(1), "OK");
});

test("swapdb", async () => {
  assertEquals(await client.swapdb(0, 1), "OK");
});
