import { nextPorts, startRedisCluster, stopRedisCluster } from "./test_util.ts";
import { TestSuite } from "../test_util.ts";
import { connect as connectToCluster } from "../../experimental/cluster/mod.ts";
import {
  assert,
  assertArrayIncludes,
  assertEquals,
  assertThrowsAsync,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import sample from "../../vendor/https/cdn.skypack.dev/lodash-es/shuffle.js";
import calculateSlot from "../../vendor/https/cdn.skypack.dev/cluster-key-slot/lib/index.js";
import { ErrorReplyError } from "../../errors.ts";
import { connect, RedisImpl } from "../../redis.ts";
import type { CommandExecutor } from "../../executor.ts";

const suite = new TestSuite("cluster/client");
const ports = nextPorts(6);
const cluster = await startRedisCluster(ports);
const nodes = ports.map((port) => ({
  hostname: "127.0.0.1",
  port,
}));
const maxConnections = nodes.length;
const client = await connectToCluster({
  nodes,
  maxConnections,
});

suite.afterAll(() => {
  stopRedisCluster(cluster);
});

suite.afterEach(() => {
  client.close();
});

suite.test("del multiple keys in the same hash slot", async () => {
  await client.set("{hoge}foo", "a");
  await client.set("{hoge}bar", "b");
  const r = await client.del("{hoge}foo", "{hoge}bar");
  assertEquals(r, 2);
});

suite.test("del multiple keys in different hash slots", async () => {
  await client.set("foo", "a");
  await client.set("bar", "b");
  await assertThrowsAsync(
    async () => {
      await client.del("foo", "bar");
    },
    ErrorReplyError,
    "-CROSSSLOT Keys in request don't hash to the same slot",
  );
});

suite.test("handle a -MOVED redirection error", async () => {
  let redirected = false;
  let manuallyRedirectedPort!: number;
  const portsSent = new Set<number>();
  const client = await connectToCluster({
    nodes,
    maxConnections,
    async newRedis(opts) {
      const redis = await connect(opts);
      const { hostname, port } = opts;
      assert(port != null);
      const proxyExecutor = {
        get connection() {
          return redis.executor.connection;
        },
        async exec(cmd, ...args) {
          if (cmd === "GET" && !redirected) {
            // Manually cause a -MOVED redirection error
            const [key] = args;
            assert(typeof key === "string");
            const slot = calculateSlot(key);
            manuallyRedirectedPort = sample(ports.filter((x) => x !== port));
            const error = new ErrorReplyError(
              `-MOVED ${slot} ${hostname}:${manuallyRedirectedPort}`,
            );
            redirected = true;
            throw error;
          } else {
            portsSent.add(Number(port));
            const reply = await redis.executor.exec(cmd, ...args);
            return reply;
          }
        },
      } as CommandExecutor;
      return new RedisImpl(proxyExecutor);
    },
  });

  try {
    await client.set("foo", "bar");
    const r = await client.get("foo");
    assertEquals(r, "bar");
    assert(redirected);
    // Check if a cluster client correctly handles a -MOVED error
    assertArrayIncludes(Array.from(portsSent), [manuallyRedirectedPort]);
  } finally {
    client.close();
  }
});

suite.runTests();
