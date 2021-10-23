import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function aclTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const client = await newClient({ hostname: "127.0.0.1", port: server.port });
  function cleanup(): void {
    client.close();
  }

  await t.step("whoami", async () => {
    assertEquals(await client.aclWhoami(), "default");
  });

  await t.step("list", async () => {
    assertEquals(await client.aclList(), [
      "user default on nopass ~* &* +@all",
    ]);
  });

  await t.step("getuser", async () => {
    assertEquals(await client.aclGetUser("default"), [
      "flags",
      ["on", "allkeys", "allchannels", "allcommands", "nopass"],
      "passwords",
      [],
      "commands",
      "+@all",
      "keys",
      ["*"],
      "channels",
      ["*"],
    ]);
  });

  await t.step("cat", async () => {
    assertEquals(
      (await client.aclCat()).sort(),
      [
        "keyspace",
        "read",
        "write",
        "set",
        "sortedset",
        "list",
        "hash",
        "string",
        "bitmap",
        "hyperloglog",
        "geo",
        "stream",
        "pubsub",
        "admin",
        "fast",
        "slow",
        "blocking",
        "dangerous",
        "connection",
        "transaction",
        "scripting",
      ].sort(),
    );
    assertEquals(
      (await client.aclCat("dangerous")).sort(),
      [
        "lastsave",
        "shutdown",
        "module",
        "monitor",
        "role",
        "client",
        "replconf",
        "config",
        "pfselftest",
        "save",
        "replicaof",
        "restore-asking",
        "restore",
        "latency",
        "swapdb",
        "slaveof",
        "bgsave",
        "debug",
        "bgrewriteaof",
        "sync",
        "flushdb",
        "keys",
        "psync",
        "pfdebug",
        "flushall",
        "failover",
        "cluster",
        "info",
        "migrate",
        "acl",
        "sort",
        "slowlog",
      ].sort(),
    );
  });

  await t.step("users", async () => {
    assertEquals(await client.aclUsers(), ["default"]);
  });

  await t.step("acl_setuser", async () => {
    assertEquals(await client.aclSetUser("alan", "+get"), "OK");
    assertEquals(await client.aclDelUser("alan"), 1);
  });

  await t.step("deluser", async () => {
    assertEquals(await client.aclDelUser("alan"), 0);
  });

  await t.step("genpass", async () => {
    assertEquals((await client.aclGenPass()).length, 64);
    const testlen = 32;
    assertEquals((await client.aclGenPass(testlen)).length, testlen / 4);
  });

  await t.step("aclauth", async () => {
    assertEquals(await client.auth("default", ""), "OK");
  });

  await t.step("log", async () => {
    const randString = "balh";
    try {
      await client.auth(randString, randString);
    } catch (_error) {
      // skip invalid username-password pair error
    }
    assertEquals((await client.aclLog(1))[0][9], randString);
    assertEquals(await client.aclLog("RESET"), "OK");
  });

  await t.step("module_list", async () => {
    assertEquals(await client.moduleList(), []);
  });

  cleanup();
}
