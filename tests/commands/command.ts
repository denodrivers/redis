import { assertEquals, assertGreater } from "../../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import { assertIsArray, usesRedisVersion } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function commandTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const server = getServer();
    client = await connect({ hostname: "127.0.0.1", port: server.port });
  });

  afterAll(() => client.close());

  describe("docs", () => {
    it(
      "returns the documentation for all commands if no arguments are provided",
      { ignore: usesRedisVersion("6") },
      async () => {
        const reply = await client.commandDocs();
        const sufficientlyLargeNumber = 128;
        assertGreater(reply.length, sufficientlyLargeNumber);
      },
    );

    it("returns the documentation for the provided commands", {
      ignore: usesRedisVersion("6"),
    }, async () => {
      const given = ["get", "set"];
      const reply = await client.commandDocs(...given);
      assertEquals(reply.length, given.length * 2);
      for (let i = 0; i < given.length; i++) {
        const j = i * 2;
        assertEquals(reply[j], given[i]);
        const documentation = reply[j + 1];
        assertIsArray(documentation);
      }
    });
  });

  describe("getKeysAndFlags", () => {
    it("returns a list of keys and flags for the given command", {
      ignore: usesRedisVersion("6"),
    }, async () => {
      const command = "SET";
      const args = ["foo", "bar", "NX"];
      const reply = await client.commandGetKeysAndFlags(command, ...args);
      assertIsArray(reply);
      assertIsArray(reply[0]);
      assertEquals(reply[0][0], "foo");
      assertIsArray(reply[0][1]);
    });
  });
}
