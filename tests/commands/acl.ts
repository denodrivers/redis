import {
  assertArrayIncludes,
  assertEquals,
  assertStringIncludes,
} from "../../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import { usesRedisVersion } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function aclTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const server = getServer();
    client = await connect({ hostname: "127.0.0.1", port: server.port });
  });

  afterAll(() => client.close());

  describe("whoami", () => {
    it("returns the username of the current connection", async () => {
      assertEquals(await client.aclWhoami(), "default");
    });
  });

  describe("list", () => {
    it("returns the ACL rules", async () => {
      const rules = await client.aclList();
      assertStringIncludes(rules[0], "user default on nopass");
      assertEquals(rules.length, 1);
    });
  });

  describe("getuser", () => {
    it("returns the user's ACL flags", async () => {
      const flags = await client.aclGetUser("default");
      assertArrayIncludes(flags, [
        "flags",
        "passwords",
        "commands",
        "channels",
      ]);
    });
  });

  describe("cat", () => {
    it("returns the available ACL categories if no arguments are given", async () => {
      assertArrayIncludes(
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
    });

    it("returns the commands in the specified category", async () => {
      assertArrayIncludes(
        (await client.aclCat("dangerous")).sort(),
        [
          "lastsave",
          "shutdown",
          "monitor",
          "role",
          "replconf",
          "pfselftest",
          "save",
          "replicaof",
          "restore-asking",
          "restore",
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
          "info",
          "migrate",
        ],
      );
    });
  });

  describe("users", () => {
    it("returns usernames", async () => {
      assertEquals(await client.aclUsers(), ["default"]);
    });
  });

  describe("setuser", () => {
    it("returns `OK` on success", async () => {
      assertEquals(await client.aclSetUser("alan", "+get"), "OK");
      assertEquals(await client.aclDelUser("alan"), 1);
    });
  });

  describe("deluser", () => {
    it("returns the number of deleted users", async () => {
      assertEquals(await client.aclDelUser("alan"), 0);
    });
  });

  describe("genpass", () => {
    it("returns the generated password", async () => {
      const reply = await client.aclGenPass();
      assertEquals(typeof reply, "string");
      assertEquals(reply.length, 64);

      const testlen = 32;
      assertEquals((await client.aclGenPass(testlen)).length, testlen / 4);
    });
  });

  describe("auth", () => {
    it("returns `OK` on success", async () => {
      assertEquals(await client.auth("default", ""), "OK");
    });
  });

  describe("log", () => {
    const randString = "balh";
    beforeAll(async () => {
      try {
        await client.auth(randString, randString);
      } catch (_error) {
        // skip invalid username-password pair error
      }
    });

    it("returns the ACL security events", async () => {
      assertEquals((await client.aclLog(1))[0][9], randString);
    });

    it("returns `OK` when called with `RESET`", async () => {
      assertEquals(await client.aclLog("RESET"), "OK");
    });
  });

  describe("module list", () => {
    it(
      "returns an empty array by default",
      { ignore: usesRedisVersion("8") },
      async () => {
        assertEquals(await client.moduleList(), []);
      },
    );

    it(
      "returns `vectorset` module by default",
      { ignore: !usesRedisVersion("8") },
      async () => {
        const moduleList = await client.moduleList();
        assertStringIncludes(JSON.stringify(moduleList[0]), "vectorset");
      },
    );
  });
}
