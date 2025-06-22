import { createLazyClient } from "../../mod.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertRejects,
} from "../../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../../deps/std/testing.ts";
import { delay } from "../../deps/std/async.ts";
import type { Connector, TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function connectionTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  const getOpts = () => ({
    hostname: "127.0.0.1",
    port: getServer().port,
  });
  beforeAll(async () => {
    client = await connect(getOpts());
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

  describe("hello", () => {
    it("works with no args", async () => {
      const reply = await client.hello();
      assertArrayIncludes(reply, ["redis"]);
    });

    it("supports AUTH", async () => {
      const reply = await client.hello({
        protover: 2,
        auth: { username: "default", password: "" },
      });
      assertArrayIncludes(reply, ["redis"]);
    });

    it("supports SETNAME", async () => {
      await client.hello({
        protover: 2,
        clientName: "deno-redis",
      });
      assertEquals(await client.clientGetName(), "deno-redis");
    });
  });

  describe("swapdb", () => {
    it("returns `OK` on success", async () => {
      assertEquals(await client.swapdb(0, 1), "OK");
    });
  });

  describe("health check", () => {
    it("should send a ping every `healthCheckInterval`", async () => {
      const opts = {
        ...getOpts(),
        healthCheckInterval: 10,
      };
      const client = await connect(opts);
      const rawPreviousCommandStats = await client.info("commandstats");
      await delay(25);
      const rawCurrentCommandStats = await client.info("commandstats");
      client.close();

      await delay(10); // NOTE: After closing the connection, no errors should occur

      const previousPingStats =
        parseCommandStats(rawPreviousCommandStats)["ping"];
      const currentPingStats =
        parseCommandStats(rawCurrentCommandStats)["ping"];
      assertExists(previousPingStats);
      assertExists(currentPingStats);

      const previousCallCount = previousPingStats["calls"];
      const currentCallCount = currentPingStats["calls"];
      const d = currentCallCount - previousCallCount;
      assert(d >= 2, `${d} should be greater than or equal to 2`);
    });
  });

  describe("createLazyClient", () => {
    it("returns the lazily connected client", async () => {
      const opts = getOpts();
      const client = createLazyClient(opts);
      assert(!client.isConnected);
      try {
        await client.get("foo");
        assert(client.isConnected);
      } finally {
        client.close();
      }
    });
  });

  describe("connect()", () => {
    it("connects to the server", async () => {
      const client = await connect(getOpts());
      assert(client.isConnected);

      client.close();
      assert(!client.isConnected);

      await client.connect();
      assert(client.isConnected);

      assertEquals(await client.ping(), "PONG");

      client.close();
    });

    it("supports AbortSignal", async () => {
      const ac = new AbortController();
      ac.abort();
      const error = await assertRejects(async () =>
        await connect({
          ...getOpts(),
          signal: () => ac.signal,
        }), DOMException);
      assertEquals(error.name, "AbortError");
    });

    it("works with a lazy client", async () => {
      const client = createLazyClient(getOpts());
      assert(!client.isConnected);

      await client.connect();
      assert(client.isConnected);

      assertEquals(await client.ping(), "PONG");

      client.close();
    });

    it("fires events", async () => {
      const client = await connect(getOpts());

      let closeEventFired = false,
        endEventFired = false;

      const firedEvents: Array<string> = [];
      client.addEventListener("close", () => {
        closeEventFired = true;
        firedEvents.push("close");
      });
      client.addEventListener("end", () => {
        endEventFired = true;
        firedEvents.push("end");
      });
      // @ts-expect-error unkwnon events should be denied
      client.addEventListener("no-such-event", () => {
        firedEvents.push("no-such-event");
      });

      client.close();

      assertEquals(closeEventFired, true);
      assertEquals(endEventFired, true);
      assertEquals(firedEvents, ["close", "end"]);
    });

    it("fires events with a lazy client", async () => {
      const client = createLazyClient(getOpts());
      const firedEvents: Array<string> = [];

      client.addEventListener("connect", (e) => {
        firedEvents.push("connect");
        assertInstanceOf(e, CustomEvent);
      });
      client.addEventListener("ready", (e) => {
        firedEvents.push("ready");
        assertInstanceOf(e, CustomEvent);
      }, { once: true });

      client.addEventListener("close", (e) => {
        firedEvents.push("close");
        assertInstanceOf(e, CustomEvent);
      });
      client.addEventListener("end", (e) => {
        firedEvents.push("end");
        assertInstanceOf(e, CustomEvent);
      });

      await client.exists("foo");
      assertEquals(firedEvents, ["connect", "ready"]);
      client.close();
      assertEquals(firedEvents, ["connect", "ready", "close", "end"]);

      await client.connect();
      await client.exists("foo");
      client.close();

      assertEquals(firedEvents, [
        "connect",
        "ready",
        "close",
        "end",
        "connect",
        "close",
        "end",
      ]);
    });
  });

  describe("using", () => {
    it("implements `Symbol.dispose`", async () => {
      using client = await connect(getOpts());
      assert(client.isConnected);
      assert(!client.isClosed);
    });
  });
}

function parseCommandStats(
  stats: string,
): Record<string, Record<string, number>> {
  return stats.split("\r\n").reduce((statsByCommand, line) => {
    if (line.startsWith("#") || line.length === 0) {
      return statsByCommand;
    }

    const [section, details] = line.split(":");
    assertExists(section);
    assertExists(details);
    const sectionPrefix = "cmdstat_";
    assert(section.startsWith(sectionPrefix));
    const command = section.slice(sectionPrefix.length);
    statsByCommand[command] = details.split(",").reduce((stats, attr) => {
      const [key, value] = attr.split("=");
      assertExists(key);
      assertExists(value);
      stats[key] = parseInt(value);
      return stats;
    }, {} as Record<string, number>);

    return statsByCommand;
  }, {} as Record<string, Record<string, number>>);
}
