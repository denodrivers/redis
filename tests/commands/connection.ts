import { connect } from "../../mod.ts";
import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import {
  afterAll,
  beforeAll,
  describe,
  it,
} from "../../vendor/https/deno.land/std/testing/bdd.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function connectionTests(
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const { port } = getServer();
    client = await newClient({ hostname: "127.0.0.1", port });
  });

  afterAll(() => client.close());

  describe("echo", () => {
    it("returns `message` as-is", async () => {
      assertEquals(await client.echo("Hello World"), "Hello World");
    });
  });

  describe("ping", () => {
    it("returns `PONG` if no argument is given", async () => {
      assertEquals(await client.ping(), "PONG");
    });

    it("returns `message` as-is", async () => {
      assertEquals(await client.ping("Deno"), "Deno");
    });
  });

  describe("quit", () => {
    it("closes the connection", async () => {
      const { port } = getServer();
      const tempClient = await connect({ hostname: "127.0.0.1", port });
      assertEquals(tempClient.isConnected, true);
      assertEquals(tempClient.isClosed, false);
      assertEquals(await tempClient.quit(), "OK");
      assertEquals(tempClient.isConnected, false);
      assertEquals(tempClient.isClosed, true);
    });
  });

  describe("select", () => {
    it("returns `OK` on success", async () => {
      assertEquals(await client.select(1), "OK");
    });
  });

  describe("swapdb", () => {
    it("returns `OK` on success", async () => {
      assertEquals(await client.swapdb(0, 1), "OK");
    });
  });
}
