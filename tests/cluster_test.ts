import { connect } from "../redis.ts";
import {
  assert,
  assertEquals,
  assertStringContains,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { startRedisCluster } from "./test_util.ts";

const test = Deno.test;

const ports = [7000, 7001, 7002];
const cleanupCluster = await startRedisCluster(...ports);
const client = await connect({ hostname: "127.0.0.1", port: 7000 });

test("[cluster] flushslots", async () => {
  assertEquals(await client.cluster_addslots(1, 2, 3), "OK");
  assertEquals(await client.cluster_addslots_range(4, 10), "OK");
});

test("[cluster] myid", async () => {
  assert(!!(await client.cluster_myid()));
});

test("[cluster] countfailurereports", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_countfailurereports(node_id), 0);
});

test("[cluster] countkeysinslot", async () => {
  assertEquals(await client.cluster_countkeysinslot(1), 0);
});

test("[cluster] delslots", async () => {
  assertEquals(await client.cluster_delslots(1, 2, 3), "OK");
  assertEquals(await client.cluster_delslots_range(4, 10), "OK");
});

test("[cluster] getkeysinslot", async () => {
  assertEquals(await client.cluster_getkeysinslot(1, 1), []);
});

test("[cluster] flushslots", async () => {
  assertEquals(await client.cluster_flushslots(), "OK");
});

test("[cluster] info", async () => {
  assertStringContains(await client.cluster_info(), "cluster_state");
});

test("[cluster] keyslot", async () => {
  assertEquals(await client.cluster_keyslot("somekey"), 11058);
});

test("[cluster] meet", async () => {
  assertEquals(await client.cluster_meet("127.0.0.1", 7001), "OK");
  assertEquals(await client.cluster_meet("127.0.0.1", 7002), "OK");
});

test("[cluster] nodes", async () => {
  const node_id = await client.cluster_myid();
  const nodes = await client.cluster_nodes();
  assertStringContains(nodes, node_id);
});

test("[cluster] replicas", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_replicas(node_id), []);
});

test("[cluster] slaves", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_slaves(node_id), []);
});

test("[cluster] forget", async () => {
  const node_id = await client.cluster_myid();
  const other_node = (await client.cluster_nodes())
    .split("\n")
    .find((n) => !n.startsWith(node_id))
    ?.split(" ")[0];
  if (other_node) {
    assertEquals(await client.cluster_forget(other_node), "OK");
  }
});

test("[cluster] reset", async () => {
  assertEquals(await client.cluster_reset(), "OK");
});

test("[cluster] saveconfig", async () => {
  assertEquals(await client.cluster_saveconfig(), "OK");
});

test("[cluster] setslot", async () => {
  const node_id = await client.cluster_myid();
  assertEquals(await client.cluster_setslot(1, "NODE", node_id), "OK");
  assertEquals(await client.cluster_setslot(1, "MIGRATING", node_id), "OK");
});

test("[cluster] setslotstable", async () => {
  assertEquals(await client.cluster_setslot_stable(1), "OK");
});

test("[cluster] slots", async () => {
  assert(Array.isArray(await client.cluster_slots()));
});

// FIXME: no way to run these cleanup after the tests, use a timeout for now
setTimeout(() => {
  cleanupCluster();
  client.close();
}, 5000);
