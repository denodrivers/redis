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

  const expectedAnimals = new Map();
  expectedAnimals.set("cat", "moo");
  expectedAnimals.set("dog", "honk");
  expectedAnimals.set("duck", "yodel");

  const expectedWeird = new Map();
  expectedWeird.set("air", "ball");
  expectedWeird.set("friend", "table");
  const expectedOdd = new Map();
  expectedOdd.set("air", "horn");
  expectedOdd.set("friend", "fiend");
  assertEquals(v, [
    {
      key,
      messages: [{
        id: "1000-0",
        field_values: expectedAnimals,
      }],
    },
    {
      key: key2,
      messages: [
        { id: "1000-0", field_values: expectedWeird },
        { id: "1001-1", field_values: expectedOdd },
      ],
    },
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

test("xreadgroup but no ack", async () => {
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
  const actualFirstStream = dataOut[0];
  assertEquals(actualFirstStream.key, key);
  assertEquals(actualFirstStream.messages[0].id, addedId);
  assertEquals(actualFirstStream.messages.length, 1);
  assertEquals(
    actualFirstStream.messages[0].field_values.get("anyfield"),
    "anyval",
  );

  // > symbol does NOT cause automatic acknowledgement by Redis
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

  const expectedMap = new Map();
  expectedMap.set("zoo", "theorize");
  expectedMap.set("gable", "train");

  assertEquals(v, [
    {
      key,
      messages: [{
        id: addedId,
        field_values: expectedMap,
      }],
    },
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

  const expectedMap = new Map();
  expectedMap.set("hop", "4");
  expectedMap.set("blip", "5");

  assertEquals(v, [
    { key, messages: [{ id: addedId, field_values: expectedMap }] },
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

      assertEquals(data[0].messages.length, 1);

      assertEquals(data[0].messages[0].field_values.get("target"), payload);

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
    const toCheck = data[0].messages;
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
  assertEquals(basicResult[0].id, firstId);
  assertEquals(basicResult[0].field_values.get("f"), "v0");

  const secondId = await client.xadd(key, "*", "f", "v1");
  const revResult = await client.xrevrange(key, "+", "-");

  assertEquals(revResult.length, 2);
  assertEquals(revResult[0].id, secondId);
  assertEquals(revResult[0].field_values.get("f"), "v1");
  assertEquals(revResult[1], firstId);
  assertEquals(revResult[1].field_values.get("f"), "v0");

  // count should limit results
  const lim = await client.xrange(key, "-", "+", 1);
  assertEquals(lim.length, 1);
  const revLim = await client.xrevrange(key, "+", "-", 1);
  assertEquals(revLim.length, 1);

  await cleanupStream(client, key);
});

test("xclaim", async () => {
  await withConsumerGroup(async (key, group) => {
    // xclaim test basic idea:
    // 1. add messages to a group
    // 2. then xreadgroup needs to define a consumer and read pending
    //    messages without acking them
    // 3. then we need to sleep 5ms and call xpending
    // 4. from here we should be able to claim message
    //    past the idle time and read them from a different consumer

    await Promise.all(
      [
        client.xadd(key, "1000-0", "field", "foo"),
        client.xadd(key, "2000-0", "field", "bar"),
      ],
    );

    const consumer = "someone";
    await client.xreadgroup(
      [key],
      [">"],
      { group, consumer },
    );

    await sleep(5); //millis

    const minIdleTime = 4;

    // minimum options
    const firstClaimed = await client.xclaim(
      key,
      { group, consumer, minIdleTime },
      "1000-0",
      "2000-0",
    );
    assertEquals(firstClaimed.length, 2);

    throw "checkity";

    // the output for justIDs will have a different shape
    await client.xclaim(
      key,
      { group, consumer, minIdleTime, justId: true },
      "3000-0",
      "3000-1",
    );

    throw "maybe write more";

    // make sure all the other options can be passed to redis
    // without some sort of disaster occurring.
    await client.xclaim(
      key,
      { group, consumer, minIdleTime, retryCount: 0, force: true },
      "4000-0",
      "5000-0",
    );
  });
});

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
