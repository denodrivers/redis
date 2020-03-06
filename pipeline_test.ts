import {
  assertEquals,
  assert
} from "./vendor/https/deno.land/std/testing/asserts.ts";
import { connect } from "./redis.ts";
const { test } = Deno;

const addr = {
  hostname: "127.0.0.1",
  port: 6379
};

test(async function testPipeline() {
  const redis = await connect(addr);
  const pl = redis.pipeline();
  await Promise.all([
    pl.ping(),
    pl.ping(),
    pl.set("set1", "value1"),
    pl.set("set2", "value2"),
    pl.mget("set1", "set2"),
    pl.del("set1"),
    pl.del("set2")
  ]);
  const ret = await pl.flush();
  assertEquals(ret, [
    ["status", "PONG"],
    ["status", "PONG"],
    ["status", "OK"],
    ["status", "OK"],
    ["array", ["value1", "value2"]],
    ["integer", 1],
    ["integer", 1]
  ]);
});

test(async function testTx() {
  const redis = await connect(addr);
  const tx1 = redis.tx();
  const tx2 = redis.tx();
  const tx3 = redis.tx();
  await redis.del("key");
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
    tx3.get("key");
  const rep1 = await tx1.flush();
  const rep2 = await tx2.flush();
  const rep3 = await tx3.flush();
  assertEquals(
    parseInt(rep1[4][1] as string),
    parseInt(rep1[0][1] as string) + 3
  );
  assertEquals(
    parseInt(rep2[4][1] as string),
    parseInt(rep2[0][1] as string) + 3
  );
  assertEquals(
    parseInt(rep3[4][1] as string),
    parseInt(rep3[0][1] as string) + 3
  );
});

test("pipeline in concurrent", async () => {
  const redis = await connect(addr);
  const tx = redis.pipeline();
  await redis.del("a", "b", "c");
  const ps: Promise<any>[] = [];
  const res1: any[] = [];
  const res2: any[] = [];
  for (const key of ["a", "b", "c"]) {
    res1.push(tx.set(key, key));
  }
  ps.push(tx.flush());
  for (const key of ["a", "b", "c"]) {
    res2.push(tx.get(key));
  }
  ps.push(tx.flush());
  const [rep1, rep2] = await Promise.all(ps);
  assertEquals(res1, [
    "OK", //set(a)
    "OK", //set(b)
    "OK" //set(c)
  ]);
  assertEquals(
    rep1,
    [
      ["status", "OK"],
      ["status", "OK"],
      ["status", "OK"]
    ] //flush()
  );
  assertEquals(res2, [
    "OK", // get(a)
    "OK", // get(b)
    "OK" //get(c)
  ]);
  assertEquals(
    rep2,
    [
      ["bulk", "a"],
      ["bulk", "b"],
      ["bulk", "c"]
    ] //flush()
  );
});
