import { connect, createLazyClient } from "../../mod.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
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
  const getOpts = () => ({
    hostname: "127.0.0.1",
    port: getServer().port,
  });
  beforeAll(async () => {
    client = await newClient(getOpts());
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

  describe("createLazyClient", () => {
    it("returns the lazily connected client", async () => {
      const opts = getOpts();
      const resources = Deno.resources();
      const client = createLazyClient(opts);
      assert(!client.isConnected);
      assertEquals(resources, Deno.resources());
      try {
        await client.get("foo");
        assert(client.isConnected);
        assertNotEquals(resources, Deno.resources());
      } finally {
        client.close();
      }
    });
  });

  describe("connect()", () => {
    it("connects to the server", async () => {
      const client = await newClient(getOpts());
      assert(client.isConnected);
      assert(!client.isClosed);

      client.close();
      assert(!client.isConnected);
      assert(client.isClosed);

      await client.connect();
      assert(client.isConnected);
      assert(!client.isClosed);

      assertEquals(await client.ping(), "PONG");

      client.close();
    });

    it("works with a lazy client", async () => {
      const client = createLazyClient(getOpts());
      assert(!client.isConnected);
      assert(client.isClosed);

      await client.connect();
      assert(client.isConnected);
      assert(!client.isClosed);

      assertEquals(await client.ping(), "PONG");

      client.close();
    });
  });
}
