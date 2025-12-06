import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertStringIncludes,
} from "../deps/std/assert.ts";
import { beforeAll, describe, it } from "../deps/std/testing.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  withTimeout,
} from "./test_util.ts";

describe("auto reconnection", () => {
  let port!: number;
  beforeAll(() => {
    port = nextPort();
  });

  it(
    "supports auto reconnection",
    withTimeout(10000, async () => {
      await using server = await startRedis({ port });
      using client = await newClient({ hostname: "127.0.0.1", port });
      assertEquals(await client.ping(), "PONG");
      await stopRedis(server);
      let reconnectingFired = 0;
      client.addEventListener("reconnecting", (e) => {
        reconnectingFired++;
        assertInstanceOf(e, CustomEvent);
      });
      await using server2 = await startRedis({ port });
      assertEquals(await client.ping(), "PONG");
      client.close();
      await stopRedis(server2);
      assertEquals(reconnectingFired, 1);
    }),
  );

  it(
    "supports auto reconnection with db spec",
    withTimeout(10000, async () => {
      // Regression test for https://github.com/denodrivers/redis/issues/430
      await using server = await startRedis({ port });
      using client = await newClient({
        hostname: "127.0.0.1",
        port,
        db: 1,
        backoff: () => 100,
      });
      assertEquals(await client.ping(), "PONG");
      await stopRedis(server);
      await using server2 = await startRedis({ port });
      assertEquals(await client.ping(), "PONG");
      const clientInfo = await client.clientInfo();
      assert(clientInfo);
      assertStringIncludes(clientInfo, "db=1");
      client.close();
      await stopRedis(server2);
    }),
  );
});
