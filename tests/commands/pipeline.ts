import { ErrorReplyError, RedisReply } from "../../mod.ts";
import {
  assert,
  assertEquals,
} from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function pipelineTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const opts = { hostname: "127.0.0.1", port: server.port };

  await t.step("testPipeline", async () => {
    const client = await newClient(opts);
    const pl = client.pipeline();
    await Promise.all([
      pl.ping(),
      pl.ping(),
      pl.set("set1", "value1"),
      pl.set("set2", "value2"),
      pl.mget("set1", "set2"),
      pl.del("set1"),
      pl.del("set2"),
    ]);
    const ret = await pl.flush();
    assertEquals(ret.length, 7);
    assertEquals(await (ret[0] as RedisReply).value(), "PONG");
    assertEquals(await (ret[1] as RedisReply).value(), "PONG");
    assertEquals(await (ret[2] as RedisReply).value(), "OK");
    assertEquals(await (ret[3] as RedisReply).value(), "OK");
    assertEquals(await (ret[4] as RedisReply).value(), ["value1", "value2"]);
    assertEquals(await (ret[5] as RedisReply).value(), 1);
    assertEquals(await (ret[6] as RedisReply).value(), 1);
    client.close();
  });

  await t.step("testTx", async () => {
    const client = await newClient(opts);
    const tx1 = client.tx();
    const tx2 = client.tx();
    const tx3 = client.tx();
    await client.del("key");
    await Promise.all<unknown>([
      tx1.get("key"),
      tx1.incr("key"),
      tx1.incr("key"),
      tx1.incr("key"),
      tx1.get("key"),
      //
      tx2.get("key"),
      tx2.incr("key"),
      tx2.incr("key"),
      tx2.incr("key"),
      tx2.get("key"),
      //
      tx3.get("key"),
      tx3.incr("key"),
      tx3.incr("key"),
      tx3.incr("key"),
      tx3.get("key"),
    ]);
    const rep1 = await tx1.flush() as Array<RedisReply>;
    const rep2 = await tx2.flush() as Array<RedisReply>;
    const rep3 = await tx3.flush() as Array<RedisReply>;
    assertEquals(
      parseInt(await rep1[4].string()),
      parseInt(await rep1[0].string()) + 3,
    );
    assertEquals(
      parseInt(await rep2[4].string()),
      parseInt(await rep2[0].string()) + 3,
    );
    assertEquals(
      parseInt(await rep3[4].string()),
      parseInt(await rep3[0].string()) + 3,
    );
    client.close();
  });

  await t.step("pipeline in concurrent", async () => {
    {
      const client = await newClient(opts);
      const tx = client.pipeline();
      const promises: Promise<unknown>[] = [];
      await client.del("a", "b", "c");
      for (const key of ["a", "b", "c"]) {
        promises.push(tx.set(key, key));
      }
      promises.push(tx.flush());
      for (const key of ["a", "b", "c"]) {
        promises.push(tx.get(key));
      }
      promises.push(tx.flush());
      const res = await Promise.all(promises) as [
        string,
        string,
        string,
        [RedisReply, RedisReply, RedisReply],
        string,
        string,
        string,
        [RedisReply, RedisReply, RedisReply],
      ];

      assertEquals(res.length, 8);
      assertEquals(res[0], "OK"); // set(a)
      assertEquals(res[1], "OK"); // set(b)
      assertEquals(res[2], "OK"); // set(c)

      // flush()
      assertEquals(res[3].length, 3);
      assertEquals(await res[3][0].value(), "OK");
      assertEquals(await res[3][1].value(), "OK");
      assertEquals(await res[3][2].value(), "OK");

      assertEquals(res[4], "OK"); // get(a)
      assertEquals(res[5], "OK"); // get(b)
      assertEquals(res[6], "OK"); // get(c)

      // flush()
      assertEquals(res[7].length, 3);
      assertEquals(await res[7][0].value(), "a");
      assertEquals(await res[7][1].value(), "b");
      assertEquals(await res[7][2].value(), "c");

      client.close();
    }
  });

  await t.step("error while pipeline", async () => {
    const client = await newClient(opts);
    const tx = client.pipeline();
    tx.set("a", "a");
    tx.eval("var", ["k"], ["v"]);
    tx.get("a");
    const resp = await tx.flush() as Array<RedisReply>;
    assertEquals(resp.length, 3);
    assertEquals(await (resp[0] as RedisReply).value(), "OK");
    assert(resp[1] instanceof ErrorReplyError);
    assertEquals(await (resp[2] as RedisReply).value(), "a");
    client.close();
  });
}
