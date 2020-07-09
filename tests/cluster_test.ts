import {
  assert,
  assertEquals,
  assertStringContains,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("cluster");
const s7001 = await startRedis({ port: 7001, clusterEnabled: true });
const s7002 = await startRedis({ port: 7002, clusterEnabled: true });
const client = await newClient({ hostname: "127.0.0.1", port: 7001 });

suite.afterAll(() => {
  stopRedis(s7001);
  stopRedis(s7002);
  client.close();
});

suite.test("addslots", async () => {
  await client.cluster_flushslots();
  assertEquals(await client.cluster_addslots(1, 2, 3), "OK");
});

suite.test("myid", async () => {
  assert(!!(await client.cluster_myid()));
});

suite.test("countfailurereports", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_countfailurereports(node_id), 0);
});

suite.test("countkeysinslot", async () => {
  assertEquals(await client.cluster_countkeysinslot(1), 0);
});

suite.test("delslots", async () => {
  assertEquals(await client.cluster_delslots(1, 2, 3), "OK");
});

suite.test("getkeysinslot", async () => {
  assertEquals(await client.cluster_getkeysinslot(1, 1), []);
});

suite.test("flushslots", async () => {
  assertEquals(await client.cluster_flushslots(), "OK");
});

suite.test("info", async () => {
  assertStringContains(await client.cluster_info(), "cluster_state");
});

suite.test("keyslot", async () => {
  assertEquals(await client.cluster_keyslot("somekey"), 11058);
});

suite.test("meet", async () => {
  assertEquals(await client.cluster_meet("127.0.0.1", 7002), "OK");
});

suite.test("nodes", async () => {
  const node_id = await client.cluster_myid();
  const nodes = await client.cluster_nodes();
  assertStringContains(nodes, node_id);
});

suite.test("replicas", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_replicas(node_id), []);
});

suite.test("slaves", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_slaves(node_id), []);
});

suite.test("forget", async () => {
  const node_id = await client.cluster_myid();
  const other_node = (await client.cluster_nodes())
    .split("\n")
    .find((n) => !n.startsWith(node_id))
    ?.split(" ")[0];
  if (other_node) {
    assertEquals(await client.cluster_forget(other_node), "OK");
  }
});

suite.test("saveconfig", async () => {
  assertEquals(await client.cluster_saveconfig(), "OK");
});

suite.test("setslot", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_setslot(1, "NODE", node_id), "OK");
  assertEquals(await client.cluster_setslot(1, "MIGRATING", node_id), "OK");
  assertEquals(await client.cluster_setslot(1, "STABLE"), "OK");
});

suite.test("slots", async () => {
  assert(Array.isArray(await client.cluster_slots()));
});

suite.test("replicate", async () => {
  const node_id = await client.cluster_myid();
  const other_node = (await client.cluster_nodes())
    .split("\n")
    .find((n) => !n.startsWith(node_id))
    ?.split(" ")[0];
  if (other_node) {
    assertEquals(await client.cluster_replicate(other_node), "OK");
  }
});

suite.test("failover", async () => {
  const node_id = await client.cluster_myid();
  const other_node = (await client.cluster_nodes())
    .split("\n")
    .find((n) => !n.startsWith(node_id))
    ?.split(" ")[0];
  if (other_node) {
    assertEquals(await client.cluster_failover(), "OK");
  }
});

suite.test("reset", async () => {
  assertEquals(await client.cluster_reset(), "OK");
});

await suite.runTests();
