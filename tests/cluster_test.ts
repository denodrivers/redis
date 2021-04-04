import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("cluster");
const port1 = nextPort();
const port2 = nextPort();
const s1 = await startRedis({ port: port1, clusterEnabled: true });
const s2 = await startRedis({ port: port2, clusterEnabled: true });
const client = await newClient({ hostname: "127.0.0.1", port: port2 });

suite.afterAll(() => {
  stopRedis(s1);
  stopRedis(s2);
  client.close();
});

suite.test("addslots", async () => {
  await client.clusterFlushSlots();
  assertEquals(await client.clusterAddSlots(1, 2, 3), "OK");
});

suite.test("myid", async () => {
  assert(!!(await client.clusterMyID()));
});

suite.test("countfailurereports", async () => {
  const nodeId = await client.clusterMyID();
  assertEquals(await client.clusterCountFailureReports(nodeId), 0);
});

suite.test("countkeysinslot", async () => {
  assertEquals(await client.clusterCountKeysInSlot(1), 0);
});

suite.test("delslots", async () => {
  assertEquals(await client.clusterDelSlots(1, 2, 3), "OK");
});

suite.test("getkeysinslot", async () => {
  assertEquals(await client.clusterGetKeysInSlot(1, 1), []);
});

suite.test("flushslots", async () => {
  assertEquals(await client.clusterFlushSlots(), "OK");
});

suite.test("info", async () => {
  assertStringIncludes(await client.clusterInfo(), "cluster_state");
});

suite.test("keyslot", async () => {
  assertEquals(await client.clusterKeySlot("somekey"), 11058);
});

suite.test("meet", async () => {
  assertEquals(await client.clusterMeet("127.0.0.1", port2), "OK");
});

suite.test("nodes", async () => {
  const nodeId = await client.clusterMyID();
  const nodes = await client.clusterNodes();
  assertStringIncludes(nodes, nodeId);
});

suite.test("replicas", async () => {
  const nodeId = await client.clusterMyID();
  assertEquals(await client.clusterReplicas(nodeId), []);
});

suite.test("slaves", async () => {
  const nodeId = await client.clusterMyID();
  assertEquals(await client.clusterSlaves(nodeId), []);
});

suite.test("forget", async () => {
  const nodeId = await client.clusterMyID();
  const otherNode = (await client.clusterNodes())
    .split("\n")
    .find((n) => !n.startsWith(nodeId))
    ?.split(" ")[0];
  if (otherNode) {
    assertEquals(await client.clusterForget(otherNode), "OK");
  }
});

suite.test("saveconfig", async () => {
  assertEquals(await client.clusterSaveConfig(), "OK");
});

suite.test("setslot", async () => {
  const nodeId = await client.clusterMyID();
  assertEquals(await client.clusterSetSlot(1, "NODE", nodeId), "OK");
  assertEquals(await client.clusterSetSlot(1, "MIGRATING", nodeId), "OK");
  assertEquals(await client.clusterSetSlot(1, "STABLE"), "OK");
});

suite.test("slots", async () => {
  assert(Array.isArray(await client.clusterSlots()));
});

suite.test("replicate", async () => {
  const nodeId = await client.clusterMyID();
  const otherNode = (await client.clusterNodes())
    .split("\n")
    .find((n) => !n.startsWith(nodeId))
    ?.split(" ")[0];
  if (otherNode) {
    assertEquals(await client.clusterReplicate(otherNode), "OK");
  }
});

suite.test("failover", async () => {
  const nodeId = await client.clusterMyID();
  const otherNode = (await client.clusterNodes())
    .split("\n")
    .find((n) => !n.startsWith(nodeId))
    ?.split(" ")[0];
  if (otherNode) {
    assertEquals(await client.clusterFailover(), "OK");
  }
});

suite.test("reset", async () => {
  assertEquals(await client.clusterReset(), "OK");
});

suite.runTests();
