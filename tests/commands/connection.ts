import { connect } from "../../mod.ts";
import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import {
  afterAll,
  beforeAll,
  it,
} from "../../vendor/https/deno.land/std/testing/bdd.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export async function connectionTests(
  server: TestServer,
): Promise<void> {
  const { port } = server;

  let client!: Redis;
  beforeAll(async () => {
    client = await newClient({ hostname: "127.0.0.1", port });
  });

  afterAll(() => client.close());

  it("echo", async () => {
    assertEquals(await client.echo("Hello World"), "Hello World");
  });

  it("ping", async () => {
    assertEquals(await client.ping(), "PONG");
    assertEquals(await client.ping("Deno"), "Deno");
  });

  it("quit", async () => {
    const tempClient = await connect({ hostname: "127.0.0.1", port });
    assertEquals(tempClient.isConnected, true);
    assertEquals(tempClient.isClosed, false);
    assertEquals(await tempClient.quit(), "OK");
    assertEquals(tempClient.isConnected, false);
    assertEquals(tempClient.isClosed, true);
  });

  it("select", async () => {
    assertEquals(await client.select(1), "OK");
  });

  it("swapdb", async () => {
    assertEquals(await client.swapdb(0, 1), "OK");
  });
}
