import { ErrorReplyError } from "../../mod.ts";
import type { Redis } from "../../mod.ts";
import {
  assert,
  assertEquals,
  assertRejects,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "../../vendor/https/deno.land/std/testing/bdd.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export function generalTests(
  getServer: () => TestServer,
): void {
  const getOpts = () => ({
    hostname: "127.0.0.1",
    port: getServer().port,
  });
  let client!: Redis;
  beforeAll(async () => {
    client = await newClient(getOpts());
  });

  beforeEach(async () => {
    await client.flushdb();
  });

  afterAll(() => client.close());

  it("can send multiple commands conccurently", async () => {
    let promises: Promise<string | null>[] = [];
    for (const key of ["a", "b", "c"]) {
      promises.push(client.set(key, key));
    }
    await Promise.all(promises);
    promises = [];
    for (const key of ["a", "b", "c"]) {
      promises.push(client.get(key));
    }
    const [a, b, c] = await Promise.all(promises);
    assertEquals(a, "a");
    assertEquals(b, "b");
    assertEquals(c, "c");
  });

  it("can treat `null` and `undefined`", async () => {
    // @ts-expect-error This error is intended
    await client.set("null", null);

    // @ts-expect-error This error is intended
    await client.set("undefined", undefined);

    assertEquals(await client.get("null"), "");
    assertEquals(await client.get("undefined"), "");
  });

  describe("connect", () => {
    it("selects the DB specified by `opts.db`", async () => {
      const opts = getOpts();
      const key = "exists";
      const client1 = await newClient({ ...opts, db: 0 });
      try {
        await client1.set(key, "aaa");
        const exists = await client1.exists(key);
        assertEquals(exists, 1);
      } finally {
        client1.close();
      }

      const client2 = await newClient({ ...opts, db: 0 });
      try {
        const exists = await client2.exists(key);
        assertEquals(exists, 1);
      } finally {
        client2.close();
      }

      const client3 = await newClient({ ...opts, db: 1 });
      try {
        const exists = await client3.exists(key);
        assertEquals(exists, 0);
      } finally {
        client3.close();
      }
    });

    it("throws an error if a wrong password is given", async () => {
      const { port } = getOpts();
      await assertRejects(async () => {
        await newClient({
          hostname: "127.0.0.1",
          port,
          password: "wrong_password",
        });
      }, ErrorReplyError);
    });

    it("throws an error if an empty password is given", async () => {
      const { port } = getOpts();
      // In Redis, authentication with an empty password will always fail.
      await assertRejects(async () => {
        await newClient({
          hostname: "127.0.0.1",
          port,
          password: "",
        });
      }, ErrorReplyError);
    });
  });

  describe("exists", () => {
    it("returns if `key` exists", async () => {
      const opts = getOpts();
      const key = "exists";
      const client1 = await newClient({ ...opts, db: 0 });
      await client1.set(key, "aaa");
      const exists1 = await client1.exists(key);
      assertEquals(exists1, 1);
      const client2 = await newClient({ ...opts, db: 1 });
      const exists2 = await client2.exists(key);
      assertEquals(exists2, 0);
      client1.close();
      client2.close();
    });

    it("can handle many keys", async () => {
      const reply = await client.exists(
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
      );
      assertEquals(reply, 0);
    });
  });

  describe("invalid port", () => {
    for (const v of [Infinity, NaN, "", "port"]) {
      it(`throws an error if \`${v}\` is given`, async () => {
        await assertRejects(
          async () => {
            await newClient({
              hostname: "127.0.0.1",
              port: v,
              maxRetryCount: 0,
            });
          },
          Error,
          "invalid",
        );
      });
    }
  });

  describe("sendCommand", () => {
    it("can handle simple types", async () => {
      // simple string
      {
        const reply = await client.sendCommand("SET", ["key", "a"]);
        assertEquals(reply, "OK");
      }

      // bulk string
      {
        const reply = await client.sendCommand("GET", ["key"]);
        assertEquals(reply, "a");
      }

      // integer
      {
        const reply = await client.sendCommand("EXISTS", ["key"]);
        assertEquals(reply, 1);
      }
    });

    it("simple strings and blob strings are returned as `Uint8Array` if `returnUint8Arrays` is set to `true`", async () => {
      const encoder = new TextEncoder();

      await client.set("key", encoder.encode("hello"));
      const reply = await client.sendCommand("GET", ["key"], {
        returnUint8Arrays: true,
      });
      assertEquals(reply, encoder.encode("hello"));
    });
  });

  describe("automatic reconnection", () => {
    it("reconnects when the connection is lost", async () => {
      const tempClient = await newClient(getOpts());
      try {
        const id = await tempClient.clientID();
        await client.clientKill({ id });
        const reply = await tempClient.ping();
        assertEquals(reply, "PONG");
      } finally {
        tempClient.close();
      }
    });

    it("fails when max retry count is exceeded", async () => {
      const tempClient = await newClient({
        ...getOpts(),
        maxRetryCount: 0,
      });
      try {
        const id = await tempClient.clientID();
        await client.clientKill({ id });
        await assertRejects(() => tempClient.ping());
      } finally {
        tempClient.close();
      }
    });

    it("does not reconnect when the connection is manually closed by the user", async () => {
      const tempClient = await newClient(getOpts());
      tempClient.close();
      await assertRejects(() => tempClient.ping());
    });
  });
}
