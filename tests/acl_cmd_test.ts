import { makeTest } from "./test_util.ts";
import {
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";

const { test, client } = await makeTest("acl_cmd");

test("whoami", async () => {
  assertEquals(await client.acl_whoami(), "default");
});

test("list", async () => {
  assertEquals(await client.acl_list(), ["user default on nopass ~* +@all"]);
});

test("getuser", async () => {
  assertEquals(await client.acl_getuser("default"),
  [ "flags",[ "on", "allkeys", "allcommands", "nopass" ],
    "passwords", [], "commands", "+@all", "keys", [ "*" ]
  ]);
});

test("cat", async () => {
  assertEquals((await client.acl_cat()).sort(),
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
    "scripting"
  ].sort());
  assertEquals((await client.acl_cat("dangerous")).sort(),
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
    "cluster",
    "info",
    "migrate",
    "acl",
    "sort",
    "slowlog"
  ].sort());
});

test("users", async () => {
  assertEquals(await client.acl_users(), ["default"])
});

test("acl_setuser", async () => {
  assertEquals(await client.acl_setuser("alan", "+get"), "OK")
  assertEquals(await client.acl_deluser("alan"), 1);
});

test("deluser", async () => {
  assertEquals(await client.acl_deluser("alan"), 0);
});

test("genpass", async () => {
  assertEquals((await client.acl_genpass()).length, 64);
  let testlen = 32
  assertEquals((await client.acl_genpass(testlen)).length, testlen / 4);
});

test("aclauth", async () => {
  assertEquals(await client.acl_auth("default", ""), "OK")
});

test("log", async () => {
  let username = "balh"
  try {
    await client.acl_auth(username, username)
  } catch (error) {
    // skip invalid username-password pair error
  }
  assertEquals((await client.acl_log(1))[0][9], username);
  assertEquals((await client.acl_log("RESET")), "OK");
});

test("module_list", async () => {
  assertEquals(await client.module_list(), []);
});
