import { assert, assertEquals, assertGreater } from "../../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import { usesRedisVersion } from "../test_util.ts";
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
        assert(Array.isArray(documentation));
      }
    });
  });
}
