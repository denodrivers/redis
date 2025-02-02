import { createPoolClient } from "../pool/mod.ts";
import { assertEquals } from "../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../deps/std/testing.ts";
import type { TestServer } from "./test_util.ts";
import { nextPort, startRedis, stopRedis } from "./test_util.ts";

describe("createPoolClient", () => {
  let port!: number;
  let server!: TestServer;
  beforeAll(async () => {
    port = nextPort();
    server = await startRedis({ port });
  });
  afterAll(() => stopRedis(server));

  it("supports distributing commands to pooled connections", async () => {
    const client = await createPoolClient({
      connection: {
        hostname: "127.0.0.1",
        port,
      },
    });
    try {
      const blpopPromise = client.blpop(500, "list");
      setTimeout(() => {
        client.lpush("list", "foo");
      }, 100);
      const existsPromise = client.exists("list");
      const replies = await Promise.all([
        blpopPromise,
        existsPromise,
      ]);
      assertEquals(
        replies,
        [["list", "foo"], 0],
        "BLPOP should not block subsequent EXISTS",
      );
    } finally {
      await client.flushdb();
      client.close();
    }
  });
});
