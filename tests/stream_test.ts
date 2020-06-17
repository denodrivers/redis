import { Redis } from "../redis.ts";
import { makeTest } from "./test_util.ts";
import {
  assertEquals,
  assert,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
const { test, client } = await makeTest("stream");

/** Return the millisecond timestamp for a given
 * streams identifier.  
 * 
 * @param id for example "1526984818136-0"
 */
const idMillis = (id: string) => parseInt(id.split("-")[0]);

const randomStream = () => `test-deno-${Math.floor(Math.random() * 1000)}`;

const cleanupStream = async (client: Redis, ...keys: string[]) => {
  await Promise.all(keys.map((key) => client.xtrim(key, { elements: 0 })));
};

const withConsumerGroup = async (
  fn: (stream: string, group: string) => any,
) => {
  const rn = Math.floor(Math.random() * 1000);
  const stream = randomStream();
  const group = `test-group-${rn}`;

  let created = await client.xgroupcreate(stream, group, "$", true);
  assertEquals(created, "OK");

  await fn(stream, group);

  assertEquals(await client.xgroupdestroy(stream, group), 1);
};

test("xadd", async () => {
  const key = randomStream();
  const v = await client.xadd(
    key,
    "*",
    "cat",
    "what",
    "dog",
    "who",
    "duck",
    "when",
  );
  assert(v != null);

  await cleanupStream(client, key);
});

test("xadd_maxlen", async () => {
  const key = randomStream();
  const v = await client.xadd_maxlen(
    key,
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
    key,
    { approx: false, elements: 10 },
    "*",
    "cat",
    "oo",
    "dog",
    "uu",
    "duck",
    "pp",
  );
  assert(x != null);
  await cleanupStream(client, key);
});

test("xread", async () => {
  const key = randomStream();
  const a = await client.xadd_maxlen(
    key,
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
  const key2 = randomStream();
  const b = await client.xadd_maxlen(
    key2,
    { elements: 10 },
    "1000-0",
    "air",
    "ball",
    "friend",
    "table",
  );
  const c = await client.xadd_maxlen(
    key2,
    { elements: 10 },
    "1001-1",
    "air",
    "horn",
    "friend",
    "fiend",
  );
  assert(c != null);

  const v = await client.xread(
    [key, key2],
    ["0-0", "0-0"],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    [key, [[
      "1000-0",
      ["cat", "moo", "dog", "honk", "duck", "yodel"],
    ]]],
    [key2, [
      ["1000-0", ["air", "ball", "friend", "table"]],
      ["1001-1", ["air", "horn", "friend", "fiend"]],
    ]],
  ]);

  await cleanupStream(client, key, key2);
});

test("xgrouphelp", async () => {
  const helpText = await client.xgrouphelp();
  assert(helpText.length > 4);
  assert(helpText[0].length > 10);
});

test("xgroup create and destroy", async () => {
  const groupName = "test-group";

  const key = randomStream();

  let created = await client.xgroupcreate(key, groupName, "$", true);
  assertEquals(created, "OK");
  try {
    await client.xgroupcreate(
      key,
      groupName,
      0,
      true,
    );
    // it should throw -BUSYERR on duplicate
    assert(false);
  } catch {
    assert(true);
  }

  assertEquals(await client.xgroupdestroy(key, groupName), 1);
});

test("xgroup setid and delconsumer", async () => {
  const key = randomStream();
  const group = "test-group";
  const consumer = "test-consumer";

  let created = await client.xgroupcreate(key, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(key, "*", "anyfield", "anyval");

  assert(addedId);

  //  must read from a given stream to create the
  //  consumer
  let data = await client.xreadgroup(
    [key],
    [">"],
    { group, consumer },
  );

  assertEquals(data.length, 1);

  assertEquals(
    await client.xgroupsetid(key, group, "0-0"),
    "OK",
  );

  assertEquals(
    await client.xgroupdelconsumer(key, group, consumer),
    1,
  );

  await cleanupStream(client, key);
});

test("xreadgroup auto ack", async () => {
  const key = randomStream();
  const group = "test-group";

  let created = await client.xgroupcreate(key, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(key, "*", "anyfield", "anyval");

  assert(addedId);

  let dataOut = await client.xreadgroup(
    [key],
    [">"],
    { group, consumer: "test-consumer" },
  );

  assertEquals(dataOut.length, 1);
  assertEquals(dataOut[0].length, 2);

  // > symbol causes automatic acknowledgement by Redis
  const ackSize = await client.xack(key, group, addedId);
  assertEquals(ackSize, 1);

  assertEquals(await client.xgroupdestroy(key, group), 1);

  await cleanupStream(client, key);
});

test("xack", async () => {
  const key = randomStream();
  const group = "test-group";

  let created = await client.xgroupcreate(key, group, "$", true);
  assertEquals(created, "OK");

  let addedId = await client.xadd(key, "*", "anyfield", "anyval");

  assert(addedId);

  // read but DO NOT auto-ack, which places
  // the message on the PEL
  await client.xreadgroup(
    [key],
    [">"],
    { group, consumer: "test-consumer" },
  );

  const acked = await client.xack(key, group, addedId);

  assertEquals(acked, 1);

  assertEquals(await client.xgroupdestroy(key, group), 1);
  await cleanupStream(client, key);
});

test("xadd_map_then_xread", async () => {
  const m = new Map();
  m.set("zoo", "theorize");
  m.set("gable", "train");

  const key = randomStream();
  const addedId = await client.xadd_map(
    key,
    "*",
    m,
  );
  assert(addedId !== null);

  const ms = idMillis(addedId);

  const v = await client.xread(
    [key],
    [(ms - 1).toString()],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    [key, [[
      addedId,
      ["zoo", "theorize", "gable", "train"],
    ]]],
  ]);

  await cleanupStream(client, key);
});

test("xadd_maxlen_map_then_xread", async () => {
  const m = new Map();
  m.set("hop", 4);
  m.set("blip", 5);

  const key = randomStream();
  const addedId = await client.xadd_maxlen_map(
    key,
    { elements: 8 },
    "*",
    m,
  );
  assert(addedId !== null);

  const ms = idMillis(addedId);

  const v = await client.xread(
    [key],
    [(ms - 1).toString()],
    { block: 5000, count: 500 },
  );

  assert(v != null);

  assertEquals(v, [
    [key, [[
      addedId,
      ["hop", "4", "blip", "5"],
    ]]],
  ]);

  await cleanupStream(client, key);
});

test("xdel", async () => {
  const key = randomStream();
  const id0 = await client.xadd_maxlen(
    key,
    { elements: 10 },
    "*",
    "foo",
    "bar",
  );
  const id1 = await client.xadd_maxlen(
    key,
    { elements: 10 },
    "*",
    "foo",
    "baz",
  );
  const id2 = await client.xadd_maxlen(
    key,
    { elements: 10 },
    "*",
    "foo",
    "qux",
  );

  const v = await client.xdel(key, id0, id1, id2);
  assert(v === 3);
  await cleanupStream(client, key);
});

test("xlen", async () => {
  const key = randomStream();
  await client.xadd_maxlen(key, { elements: 5 }, "*", "foo", "qux");
  await client.xadd_maxlen(key, { elements: 5 }, "*", "foo", "bux");

  const v = await client.xlen(key);
  assert(v === 2);
  await cleanupStream(client, key);
});

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

      await cleanupStream(client, key);
    }
  });
});

test("broadcast pattern, all groups read their own version of the stream", async () => {
  const key = randomStream();
  const group0 = "tg0";
  const group1 = "tg1";
  const group2 = "tg2";
  const groups = [group0, group1, group2];

  for (const g of groups) {
    let created = await client.xgroupcreate(key, g, "$", true);
    assertEquals(created, "OK");
  }

  const addedIds = [];

  let msgCount = 0;
  for (const group of groups) {
    const payload = `data-${msgCount}`;
    const a = await client.xadd(key, "*", "target", payload);
    assert(a);
    addedIds.push(a);
    msgCount++;

    const consumer = "someconsumer";
    let data = await client.xreadgroup(
      [key],
      [">"],
      { group, consumer },
    );

    // each group should see ALL the messages
    // that have been emitted
    const toCheck = data[0][1];
    assertEquals(toCheck.length, msgCount);
  }

  for (const g of groups) {
    assertEquals(await client.xgroupdestroy(key, g), 1);
  }

  await cleanupStream(client, key);
});

test("xrange and xrevrange", async () => {
  const key = randomStream();
  const firstId = await client.xadd(key, "*", "f", "v0");
  const basicResult = await client.xrange(key, "-", "+");
  assertEquals(basicResult.length, 1);
  assertEquals(basicResult[0][0], firstId);
  assertEquals(basicResult[0][1], ["f", "v0"]);

  const secondId = await client.xadd(key, "*", "f", "v1");
  const revResult = await client.xrevrange(key, "+", "-");
  console.log("greetings");
  console.log(JSON.stringify(revResult));
  assertEquals(revResult.length, 2);
  assertEquals(revResult[0][0], secondId);
  assertEquals(revResult[0][1], ["f", "v1"]);
  assertEquals(revResult[1][0], firstId);
  assertEquals(revResult[1][1], ["f", "v0"]);

  // count should limit results
  const lim = await client.xrange(key, "-", "+", 1);
  assertEquals(lim.length, 1);
  const revLim = await client.xrevrange(key, "+", "-", 1);
  assertEquals(revLim.length, 1);

  await cleanupStream(client, key);
});
