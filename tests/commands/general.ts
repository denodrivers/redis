import {
  BulkReply,
  createLazyClient,
  ErrorReplyError,
  replyTypes,
} from "../../mod.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function generalTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const { port } = server;
  const opts = { hostname: "127.0.0.1", port };
  const client = await newClient(opts);

  function cleanup(): void {
    client.close();
  }

  await t.step("conccurent", async () => {
    let promises: Promise<string | undefined>[] = [];
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

  await t.step("db0", async () => {
    const key = "exists";
    const client1 = await newClient({ ...opts, db: 0 });
    await client1.set(key, "aaa");
    const exists1 = await client1.exists(key);
    assertEquals(exists1, 1);
    const client2 = await newClient({ ...opts, db: 0 });
    const exists2 = await client2.exists(key);
    assertEquals(exists2, 1);
    client1.close();
    client2.close();
  });

  await t.step("connect with wrong password", async () => {
    await assertRejects(async () => {
      await newClient({
        hostname: "127.0.0.1",
        port,
        password: "wrong_password",
      });
    }, ErrorReplyError);
  });

  await t.step("connect with empty password", async () => {
    // In Redis, authentication with an empty password will always fail.
    await assertRejects(async () => {
      await newClient({
        hostname: "127.0.0.1",
        port,
        password: "",
      });
    }, ErrorReplyError);
  });

  await t.step("exists", async () => {
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

  for (const v of [Infinity, NaN, "", "port"]) {
    await t.step(`invalid port: ${v}`, async () => {
      await assertRejects(
        async () => {
          await newClient({ hostname: "127.0.0.1", port: v });
        },
        Error,
        "invalid",
      );
    });
  }

  await t.step("sendCommand - simple types", async () => {
    // simple string
    {
      const reply = await client.sendCommand("SET", "key", "a");
      assertEquals(reply.type, replyTypes.SimpleString);
      assertEquals(reply.value(), "OK");
    }

    // bulk string
    {
      const reply = await client.sendCommand("GET", "key");
      assertEquals(reply.type, replyTypes.BulkString);
      assertEquals(reply.value(), "a");
    }

    // integer
    {
      const reply = await client.sendCommand("EXISTS", "key");
      assertEquals(reply.type, replyTypes.Integer);
      assertEquals(reply.value(), 1);
    }
  });

  await t.step("sendCommand - get the raw data as Uint8Array", async () => {
    const encoder = new TextEncoder();
    await client.set("key", encoder.encode("hello"));
    const reply = await client.sendCommand("GET", "key");
    assertEquals(reply.type, replyTypes.BulkString);
    assertEquals((reply as BulkReply).buffer(), encoder.encode("hello"));
  });

  await t.step("lazy client", async () => {
    const resources = Deno.resources();
    const client = createLazyClient(opts);
    assert(!client.isConnected);
    assertEquals(resources, Deno.resources());
    try {
      await client.get("foo");
      assert(client.isConnected);
      assertNotEquals(resources, Deno.resources());
    } finally {
      client.close();
    }
  });

  cleanup();
}
