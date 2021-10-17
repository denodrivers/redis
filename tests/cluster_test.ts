import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, nextPort, startRedis, stopRedis } from "./test_util.ts";

Deno.test("cluster", async (t) => {
  const port1 = nextPort();
  const port2 = nextPort();
  const s1 = await startRedis({ port: port1, clusterEnabled: true });
  const s2 = await startRedis({ port: port2, clusterEnabled: true });
  const client = await newClient({ hostname: "127.0.0.1", port: port2 });

  function cleanup(): void {
    stopRedis(s1);
    stopRedis(s2);
    client.close();
  }

  await t.step("addslots", async () => {
    await client.clusterFlushSlots();
    assertEquals(await client.clusterAddSlots(1, 2, 3), "OK");
  });

  await t.step("myid", async () => {
    assert(!!(await client.clusterMyID()));
  });

  await t.step("countfailurereports", async () => {
    const nodeId = await client.clusterMyID();
    assertEquals(await client.clusterCountFailureReports(nodeId), 0);
  });

  await t.step("countkeysinslot", async () => {
    assertEquals(await client.clusterCountKeysInSlot(1), 0);
  });

  await t.step("delslots", async () => {
    assertEquals(await client.clusterDelSlots(1, 2, 3), "OK");
  });

  await t.step("getkeysinslot", async () => {
    assertEquals(await client.clusterGetKeysInSlot(1, 1), []);
  });

  await t.step("flushslots", async () => {
    assertEquals(await client.clusterFlushSlots(), "OK");
  });

  await t.step("info", async () => {
    assertStringIncludes(await client.clusterInfo(), "cluster_state");
  });

  await t.step("keyslot", async () => {
    assertEquals(await client.clusterKeySlot("somekey"), 11058);
  });

  await t.step("meet", async () => {
    assertEquals(await client.clusterMeet("127.0.0.1", port2), "OK");
  });

  await t.step("nodes", async () => {
    const nodeId = await client.clusterMyID();
    const nodes = await client.clusterNodes();
    assertStringIncludes(nodes, nodeId);
  });

  await t.step("replicas", async () => {
    const nodeId = await client.clusterMyID();
    assertEquals(await client.clusterReplicas(nodeId), []);
  });

  await t.step("slaves", async () => {
    const nodeId = await client.clusterMyID();
    assertEquals(await client.clusterSlaves(nodeId), []);
  });

  await t.step("forget", async () => {
    const nodeId = await client.clusterMyID();
    const otherNode = (await client.clusterNodes())
      .split("\n")
      .find((n) => !n.startsWith(nodeId))
      ?.split(" ")[0];
    if (otherNode) {
      assertEquals(await client.clusterForget(otherNode), "OK");
    }
  });

  await t.step("saveconfig", async () => {
    assertEquals(await client.clusterSaveConfig(), "OK");
  });

  await t.step("setslot", async () => {
    const nodeId = await client.clusterMyID();
    assertEquals(await client.clusterSetSlot(1, "NODE", nodeId), "OK");
    assertEquals(await client.clusterSetSlot(1, "MIGRATING", nodeId), "OK");
    assertEquals(await client.clusterSetSlot(1, "STABLE"), "OK");
  });

  await t.step("slots", async () => {
    assert(Array.isArray(await client.clusterSlots()));
  });

  await t.step("replicate", async () => {
    const nodeId = await client.clusterMyID();
    const otherNode = (await client.clusterNodes())
      .split("\n")
      .find((n) => !n.startsWith(nodeId))
      ?.split(" ")[0];
    if (otherNode) {
      assertEquals(await client.clusterReplicate(otherNode), "OK");
    }
  });

  await t.step("failover", async () => {
    const nodeId = await client.clusterMyID();
    const otherNode = (await client.clusterNodes())
      .split("\n")
      .find((n) => !n.startsWith(nodeId))
      ?.split(" ")[0];
    if (otherNode) {
      assertEquals(await client.clusterFailover(), "OK");
    }
  });

  await t.step("reset", async () => {
    assertEquals(await client.clusterReset(), "OK");
  });

  cleanup();
});
