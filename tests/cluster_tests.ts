import {
  assert,
  assertEquals,
  assertStringContains,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client } = await makeTest("cluster");

test("addslots", async () => {
  await client.cluster_flushslots();
  assertEquals(await client.cluster_addslots(1, 2, 3), "OK");
  assertEquals(await client.cluster_addslots_range(4, 10), "OK");
});

test("myid", async () => {
  assert(!!(await client.cluster_myid()));
});

test("countfailurereports", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_countfailurereports(node_id), 0);
});

test("countkeysinslot", async () => {
  assertEquals(await client.cluster_countkeysinslot(1), 0);
});

test("delslots", async () => {
  assertEquals(await client.cluster_delslots(1, 2, 3), "OK");
  assertEquals(await client.cluster_delslots_range(4, 10), "OK");
});

test("getkeysinslot", async () => {
  assertEquals(await client.cluster_getkeysinslot(1, 1), []);
});

test("flushslots", async () => {
  assertEquals(await client.cluster_flushslots(), "OK");
});

test("info", async () => {
  assertStringContains(await client.cluster_info(), "cluster_state");
});

test("keyslot", async () => {
  assertEquals(await client.cluster_keyslot("somekey"), 11058);
});

// Need another redis-server with cluster enabled on 6380
test("meet", async () => {
  assertEquals(await client.cluster_meet("127.0.0.1", 6380), "OK");
});

test("nodes", async () => {
  const node_id = await client.cluster_myid();
  const nodes = await client.cluster_nodes();
  assertStringContains(nodes, node_id);
});

test("replicas", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_replicas(node_id), []);
});

test("slaves", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_slaves(node_id), []);
});

test("forget", async () => {
  const node_id = await client.cluster_myid();
  const other_node = (await client.cluster_nodes())
    .split("\n")
    .find((n) => !n.startsWith(node_id))
    ?.split(" ")[0];
  if (other_node) {
    assertEquals(await client.cluster_forget(other_node), "OK");
  }
});

test("reset", async () => {
  assertEquals(await client.cluster_reset(), "OK");
});

test("saveconfig", async () => {
  assertEquals(await client.cluster_saveconfig(), "OK");
});

test("setslot", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_setslot(1, "NODE", node_id), "OK");
  assertEquals(await client.cluster_setslot(1, "MIGRATING", node_id), "OK");
});

test("setslotstable", async () => {
  assertEquals(await client.cluster_setslot_stable(1), "OK");
});

test("slots", async () => {
  assert(Array.isArray(await client.cluster_slots()));
});
