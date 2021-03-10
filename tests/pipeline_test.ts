import { ErrorReplyError } from "../mod.ts";
import type { BulkReply, IntegerReply, StatusReply } from "../protocol/mod.ts";
import {
  assert,
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("pipeline");
const server = await startRedis({ port: 7014 });
const opts = { hostname: "127.0.0.1", port: 7014 };

suite.afterAll(() => {
  stopRedis(server);
});

suite.test("testPipeline", async () => {
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
  assertEquals(ret, [
    ["status", "PONG"],
    ["status", "PONG"],
    ["status", "OK"],
    ["status", "OK"],
    ["array", ["value1", "value2"]],
    ["integer", 1],
    ["integer", 1],
  ]);
  client.close();
});

suite.test("testTx", async () => {
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
  const rep1 = await tx1.flush() as [
    BulkReply,
    IntegerReply,
    IntegerReply,
    IntegerReply,
    BulkReply,
  ];
  const rep2 = await tx2.flush() as [
    BulkReply,
    IntegerReply,
    IntegerReply,
    IntegerReply,
    BulkReply,
  ];
  const rep3 = await tx3.flush() as [
    BulkReply,
    IntegerReply,
    IntegerReply,
    IntegerReply,
    BulkReply,
  ];
  assertEquals(
    parseInt(rep1[4].string()!),
    parseInt(rep1[0].string()!) + 3,
  );
  assertEquals(
    parseInt(rep2[4].string()!),
    parseInt(rep2[0].string()!) + 3,
  );
  assertEquals(
    parseInt(rep3[4].string()!),
    parseInt(rep3[0].string()!) + 3,
  );
  client.close();
});

suite.test("pipeline in concurrent", async () => {
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
    const res = await Promise.all(promises);
    assertEquals(res, [
      "OK", // set(a)
      "OK", // set(b)
      "OK", // set(c)
      [
        ["status", "OK"],
        ["status", "OK"],
        ["status", "OK"],
      ], // flush()
      "OK", // get(a)
      "OK", // get(b)
      "OK", // get(c)
      [
        ["bulk", "a"],
        ["bulk", "b"],
        ["bulk", "c"],
      ],
    ] // flush()
    );
    client.close();
  }
});

suite.test("error while pipeline", async () => {
  const client = await newClient(opts);
  const tx = client.pipeline();
  tx.set("a", "a");
  tx.eval("var", ["k"], ["v"]);
  tx.get("a");
  const resp = await tx.flush();
  assertEquals(resp.length, 3);
  assertEquals((resp[0] as StatusReply).type, "status");
  assertEquals((resp[0] as StatusReply).status(), "status");
  assert(resp[1] instanceof ErrorReplyError);
  assertEquals((resp[2] as BulkReply).type, "bulk");
  assertEquals((resp[2] as BulkReply).string(), "a");
  client.close();
});

suite.runTests();
