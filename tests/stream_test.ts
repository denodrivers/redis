// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup

import { makeTest } from "./test_util.ts";
import {
  assertEquals,
  assertArrayContains,
  assert,
  assertThrows,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
const { test, client } = await makeTest("stream");

test("xadd", async () => {
  const v = await client.xadd(
    "key1",
    "*",
    "cat",
    "what",
    "dog",
    "who",
    "duck",
    "when",
  );
});

test("xadd_maxlen", async () => {
  const v = await client.xadd_maxlen(
    "key1",
    { elements: 10 },
    "*",
    "cat",
    "meow",
    "dog",
    "woof",
    "duck",
    "quack",
  );
  assert(v != null);
  const x = await client.xadd_maxlen(
    "key1",
    { exact: true, elements: 10 },
    "*",
    "cat",
    "oo",
    "dog",
    "uu",
    "duck",
    "pp",
  );
  assert(x != null);
});

test("xread", async () => {
  const a = await client.xadd_maxlen(
    "key1",
    { elements: 10 },
    "1000-0",
    "cat",
    "moo",
    "dog",
    "honk",
    "duck",
    "yodel",
  );
  assert(a != null);
  const b = await client.xadd_maxlen(
    "key2",
    { elements: 10 },
    "1000-0",
    "air",
    "ball",
    "friend",
    "table",
  );
  const c = await client.xadd_maxlen(
    "key2",
    { elements: 10 },
    "1001-1",
    "air",
    "horn",
    "friend",
    "fiend",
  );
  assert(c != null);

  const v = await client.xread(
    ["key1", "key2"],
    ["0-0", "0-0"],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    ["key1", [[
      "1000-0",
      ["cat", "moo", "dog", "honk", "duck", "yodel"],
    ]]],
    ["key2", [
      ["1000-0", ["air", "ball", "friend", "table"]],
      ["1001-1", ["air", "horn", "friend", "fiend"]],
    ]],
  ]);
});

test("xgrouphelp", async () => {
  const helpText = await client.xgrouphelp();
  assert(helpText.length > 4);
  assert(helpText[0].length > 10);
});

test("xgroup create and destroy", async () => {
  const stream = `test-deno-${Math.floor(Math.random() * 1000)}`;
  const groupName = "test-group";

  let created = await client.xgroupcreate(stream, groupName, "$", true);
  assertEquals(created, "OK");
  try {
    await client.xgroupcreate(
      stream,
      groupName,
      0,
      true,
    );
    // it should throw -BUSYERR on duplicate
    assert(false);
  } catch {
    assert(true);
  }

  assertEquals(await client.xgroupdestroy(stream, groupName), 1);
});

test("xgroup setid and delconsumer", async () => {
  const stream = `test-deno-${Math.floor(Math.random() * 1000)}`;
  const group = "test-group";
  const consumer = "test-consumer";

  let created = await client.xgroupcreate(stream, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(stream, "*", "anyfield", "anyval");

  assert(addedId);

  //  must read from a given stream to create the
  //  consumer
  let data = await client.xreadgroup(
    [stream],
    [">"],
    { group, consumer },
  );

  assertEquals(data.length, 1);

  assertEquals(
    await client.xgroupsetid(stream, group, "0-0"),
    "OK",
  );

  assertEquals(
    await client.xgroupdelconsumer(stream, group, consumer),
    1,
  );
});

test("xreadgroup auto ack", async () => {
  const stream = `test-deno-${Math.floor(Math.random() * 1000)}`;
  const group = "test-group";

  let created = await client.xgroupcreate(stream, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(stream, "*", "anyfield", "anyval");

  assert(addedId);

  let dataOut = await client.xreadgroup(
    [stream],
    [">"],
    { group, consumer: "test-consumer", autoAck: true },
  );

  assertEquals(dataOut.length, 1);
  assertEquals(dataOut[0].length, 2);

  // will have already been acknowledged
  const ackSize = await client.xack(stream, group, addedId);
  assertEquals(ackSize, 0);

  assertEquals(await client.xgroupdestroy(stream, group), 1);

  // TODO xtrim xdel
});

test("xack", async () => {
  const stream = `test-deno-${Math.floor(Math.random() * 1000)}`;
  const group = "test-group";

  let created = await client.xgroupcreate(stream, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(stream, "*", "anyfield", "anyval");

  assert(addedId);

  // read but DO NOT auto-ack, which places
  // the message on the PEL
  await client.xreadgroup(
    [stream],
    [">"],
    { group, consumer: "test-consumer", autoAck: false },
  );

  const acked = await client.xack(stream, group, addedId);

  assertEquals(acked, 1);

  assertEquals(await client.xgroupdestroy(stream, group), 1);
  // TODO xtrim xdel
});

test("xadd_map_then_xread", async () => {
  const m = new Map();
  m.set("zoo", "theorize");
  m.set("gable", "train");
  const addedId = await client.xadd_map(
    "key5",
    "*",
    m,
  );
  assert(addedId !== null);

  // TODO
  const idMillis = parseInt(addedId.split("-")[0]);

  const v = await client.xread(
    ["key5"],
    [(idMillis - 1).toString()],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    ["key5", [[
      addedId,
      ["zoo", "theorize", "gable", "train"],
    ]]],
  ]);
});

test("xadd_maxlen_map_then_xread", async () => {
  const m = new Map();
  m.set("hop", 4);
  m.set("blip", 5);
  const addedId = await client.xadd_maxlen_map(
    "key6",
    { elements: 8 },
    "*",
    m,
  );
  assert(addedId !== null);

  // TODO
  const idMillis = parseInt(addedId.split("-")[0]);

  const v = await client.xread(
    ["key6"],
    [(idMillis - 1).toString()],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    ["key6", [[
      addedId,
      ["hop", "4", "blip", "5"],
    ]]],
  ]);
});

test("unique message per consumer", () => {
  withConsumerGroup(async (key, group) => {
    const addedIds = [];
    const c0 = "consumer-0";
    const c1 = "consumer-1";
    const c2 = "consumer-2";

    for (const consumer of [c0, c1, c2]) {
      const a = await client.xadd(key, "*", "target", `data-for-${consumer}`);
      assert(a);
      addedIds.push(a);

      let data = await client.xreadgroup(
        [key],
        [">"],
        { group, consumer },
      );

      assertEquals(data.length, 1);
      console.log(JSON.stringify(data));
    }
  });
});

test("xdel", async () => {
  const id0 = await client.xadd_maxlen(
    "key3",
    { elements: 10 },
    "*",
    "foo",
    "bar",
  );
  const id1 = await client.xadd_maxlen(
    "key3",
    { elements: 10 },
    "*",
    "foo",
    "baz",
  );
  const id2 = await client.xadd_maxlen(
    "key3",
    { elements: 10 },
    "*",
    "foo",
    "qux",
  );

  const v = await client.xdel("key3", id0, id1, id2);
  assert(v === 3);
});

test("xlen", async () => {
  await client.xadd_maxlen("key3", { elements: 5 }, "*", "foo", "qux");
  await client.xadd_maxlen("key3", { elements: 5 }, "*", "foo", "bux");

  const v = await client.xlen("key3");
  assert(v === 2);
});

const withConsumerGroup = async (
  fn: (stream: string, group: string) => any,
) => {
  const rn = Math.floor(Math.random() * 1000);
  const stream = `test-deno-${rn}`;
  const group = `test-group-${rn}`;

  let created = await client.xgroupcreate(stream, group, "$", true);
  assertEquals(created, "OK");

  fn(stream, group);

  assertEquals(await client.xgroupdestroy(stream, group), 1);
};

// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
