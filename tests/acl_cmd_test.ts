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
  assertEquals(await client.acl_cat(),
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
  ]);
  assertEquals(await client.acl_cat("dangerous"),
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
  ]);
});
