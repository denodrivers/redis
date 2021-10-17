import { connect } from "../mod.ts";
import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("connection", async (t) => {
  const port = nextPort();
  const server = await startRedis({ port });
  const client = await newClient({ hostname: "127.0.0.1", port });

  function cleanup(): void {
    stopRedis(server);
    client.close();
  }

  await t.step("echo", async () => {
    assertEquals(await client.echo("Hello World"), "Hello World");
  });

  await t.step("ping", async () => {
    assertEquals(await client.ping(), "PONG");
    assertEquals(await client.ping("Deno"), "Deno");
  });

  await t.step("quit", async () => {
    const tempClient = await connect({ hostname: "127.0.0.1", port });
    assertEquals(tempClient.isConnected, true);
    assertEquals(tempClient.isClosed, false);
    assertEquals(await tempClient.quit(), "OK");
    assertEquals(tempClient.isConnected, false);
    assertEquals(tempClient.isClosed, true);
  });

  await t.step("select", async () => {
    assertEquals(await client.select(1), "OK");
  });

  await t.step("swapdb", async () => {
    assertEquals(await client.swapdb(0, 1), "OK");
  });

  cleanup();
});
