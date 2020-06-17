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

const randomStream = () => `test-deno-${Math.floor(Math.random() * 1000)}`;

test("xgroup create and destroy", async () => {
  const groupName = "test-group";

  const stream = randomStream();

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
    { group, consumer: "test-consumer" },
  );

  assertEquals(dataOut.length, 1);
  assertEquals(dataOut[0].length, 2);

  // > symbol causes automatic acknowledgement by Redis
  const ackSize = await client.xack(stream, group, addedId);
  assertEquals(ackSize, 1);

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
    { group, consumer: "test-consumer" },
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

  await fn(stream, group);

  assertEquals(await client.xgroupdestroy(stream, group), 1);
};

test("unique message per consumer", async () => {
  await withConsumerGroup(async (key, group) => {
    const addedIds = [];
    const c0 = "consumer-0";
    const c1 = "consumer-1";
    const c2 = "consumer-2";

    for (const consumer of [c0, c1, c2]) {
      const payload = `data-for-${consumer}`;
      const a = await client.xadd(key, "*", "target", payload);
      assert(a);
      addedIds.push(a);

      let data = await client.xreadgroup(
        [key],
        [">"],
        { group, consumer },
      );

      assertEquals(data[0][1].length, 1);

      // TODO this isn't a great way to navigate
      // TODO we should have a more legible way
      // TODO to deal with the payload
      assertEquals(data[0][1][0][1][1], payload);
    }
  });
});

test("broadcast pattern, all groups read their own version of the stream", async () => {
  const rn = Math.floor(Math.random() * 1000);
  const key = `test-deno-${rn}`;
  const group0 = `test-group-${rn}0`;
  const group1 = `test-group-${rn}1`;
  const group2 = `test-group-${rn}2`;
  const groups = [group0, group1, group2];

  for (const g of groups) {
    let created = await client.xgroupcreate(key, g, "$", true);
    assertEquals(created, "OK");
  }

  const addedIds = [];

  let msgCount = 0;
  for (const group of groups) {
    console.log(`xadd ${key}`);
    const payload = `data-${msgCount}`;
    const a = await client.xadd(key, "*", "target", payload);
    assert(a);
    addedIds.push(a);
    msgCount++;
    console.log(`added ID ${a}`);

    const consumer = "someconsumer";
    let data = await client.xreadgroup(
      [key],
      [">"],
      { group, consumer },
    );

    console.log(JSON.stringify(data));

    // each group should see ALL the messages
    // that have been emitted
    const toCheck = data[0][1];
    assertEquals(toCheck.length, msgCount);

    // TODO this isn't a great way to navigate
    // TODO we should have a more legible way
    // TODO to deal with the payload
    // TODO assert ?? assertEquals(data[0][1][0][1][1], payload);
  }

  for (const g of groups) {
    assertEquals(await client.xgroupdestroy(key, g), 1);
  }
});

test("xrange and xrevrange", async () => {
  const stream = randomStream();
  const firstId = await client.xadd(stream, "*", "f", "v0");
  const basicResult = await client.xrange(stream, "-", "+");
  assertEquals(basicResult.length, 1);
  assertEquals(basicResult[0][0], firstId);
  assertEquals(basicResult[0][1], ["f", "v0"]);

  const secondId = await client.xadd(stream, "*", "f", "v1");
  const revResult = await client.xrevrange(stream, "+", "-");
  console.log("greetings");
  console.log(JSON.stringify(revResult));
  assertEquals(revResult.length, 2);
  assertEquals(revResult[0][0], secondId);
  assertEquals(revResult[0][1], ["f", "v1"]);
  assertEquals(revResult[1][0], firstId);
  assertEquals(revResult[1][1], ["f", "v0"]);

  // count should limit results
  const lim = await client.xrange(stream, "-", "+", 1);
  assertEquals(lim.length, 1);
  const revLim = await client.xrevrange(stream, "-", "+", 1);
  assertEquals(revLim.length, 1);
});

// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
