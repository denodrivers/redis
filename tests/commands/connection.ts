import { connect } from "../../mod.ts";
import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function connectionTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const { port } = server;
  const client = await newClient({ hostname: "127.0.0.1", port });
  function cleanup(): void {
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
}
