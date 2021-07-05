import { nextPorts, startRedisCluster, stopRedisCluster } from "./test_util.ts";
import { TestSuite } from "../test_util.ts";
import { connect } from "../../experimental/cluster/mod.ts";
import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";

const suite = new TestSuite("cluster/key");
const ports = nextPorts(6);
const cluster = await startRedisCluster(ports);
const client = await connect({
  nodes: ports.map((port) => ({
    hostname: "127.0.0.1",
    port,
  })),
  maxConnections: ports.length,
});

suite.afterAll(() => {
  stopRedisCluster(cluster);
});

suite.test("del", async () => {
  await client.set("{hoge}foo", "a");
  await client.set("{hoge}bar", "b");
  const r = await client.del("{hoge}foo", "{hoge}bar");
  assertEquals(r, 2);
});

suite.runTests();
