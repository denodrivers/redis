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
