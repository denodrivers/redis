import { ErrorReplyError } from "../errors.ts";
import { Redis } from "../mod.ts";
import { parseXId } from "../stream.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("stream");
const server = await startRedis({ port: 7012 });
const client = await newClient({ hostname: "127.0.0.1", port: 7012 });

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

const randomStream = () =>
  `test-deno-${(new Date().getTime())}-${Math.floor(Math.random() * 1000)}${
    Math.floor(Math.random() * 1000)
  }${Math.floor(Math.random() * 1000)}`;

const cleanupStream = async (client: Redis, ...keys: string[]) => {
  await Promise.all(keys.map((key) => client.xtrim(key, { elements: 0 })));
};

const withConsumerGroup = async (
  // deno-lint-ignore no-explicit-any
  fn: (stream: string, group: string) => any,
) => {
  const rn = Math.floor(Math.random() * 1000);
  const stream = randomStream();
  const group = `test-group-${rn}`;

  const created = await client.xgroup_create(stream, group, "$", true);
  assertEquals(created, "OK");

  await fn(stream, group);

  assertEquals(await client.xgroup_destroy(stream, group), 1);
};

suite.test("xadd", async () => {
  const key = randomStream();
  const v = await client.xadd(key, "*", {
    cat: "what",
    dog: "who",
    duck: "when",
  });
  assert(v != null);

  await cleanupStream(client, key);
});

suite.test("xadd maxlen", async () => {
  const key = randomStream();
  const v = await client.xadd(
    key,
    "*",
    { cat: "meow", dog: "woof", duck: "quack" },
    { elements: 10 },
  );
  assert(v != null);
  const x = await client.xadd(
    key,
    "*",
    { cat: "oo", dog: "uu", duck: "pp" },
    { approx: false, elements: 10 },
  );
  assert(x != null);
  await cleanupStream(client, key);
});

suite.test("xreadgroup multiple streams", async () => {
  await withConsumerGroup(async (key, group) => {
    const key2 = randomStream();

    const created = await client.xgroup_create(key2, group, "$", true);
    assertEquals(created, "OK");

    await Promise.all([
      client.xadd(key, "*", { a: 1, b: 2 }),
      client.xadd(key, "*", { a: 6, b: 7 }),
      client.xadd(key2, "*", { c: "three", d: "four" }),
    ]);

    const reply = await client.xreadgroup(
      [
        [key, ">"],
        [key2, ">"],
      ],
      { group, consumer: "any" },
    );

    assertEquals(reply.length, 2);
    assertEquals(reply[0].key, key);
    assertEquals(reply[0].messages.length, 2);
    assertEquals(reply[1].key, key2);
    assertEquals(reply[1].messages.length, 1);

    // first stream cleaned up by withConsumerGroup
    await cleanupStream(client, key2);
  });
});

suite.test("xread", async () => {
  const key = randomStream();
  const a = await client.xadd(
    key,
    1000, // epoch millis only, converts to "1000-0" for the low-level interface to redis
    { cat: "moo", dog: "honk", duck: "yodel" },
    { elements: 10 },
  );
  assert(a != null);
  const key2 = randomStream();

  const b = await client.xadd(
    key2,
    [1000, 0], // You may enter the ID as a numeric pair
    { air: "ball", friend: "table" },
    { elements: 10 },
  );
  const exampleMap = new Map<string, string>();
  exampleMap.set("air", "horn");
  exampleMap.set("friend", "fiend");
  const c = await client.xadd(key2, [1001, 1], exampleMap, { elements: 10 });
  assert(c != null);

  const xid = 0;
  const v = await client.xread(
    [
      { key, xid },
      { key: key2, xid },
    ],
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
      messages: [
        {
          xid: parseXId("1000-0"),
          field_values: expectedAnimals,
        },
      ],
    },
    {
      key: key2,
      messages: [
        { xid: parseXId("1000-0"), field_values: expectedWeird },
        { xid: parseXId("1001-1"), field_values: expectedOdd },
      ],
    },
  ]);

  await cleanupStream(client, key, key2);
});

suite.test("xgrouphelp", async () => {
  const helpText = await client.xgroup_help();
  assert(helpText.length > 4);
  assert(helpText[0].length > 10);
});

suite.test("xgroup create and destroy", async () => {
  const groupName = "test-group";

  const key = randomStream();

  const created = await client.xgroup_create(key, groupName, "$", true);
  assertEquals(created, "OK");
  await assertThrowsAsync(
    async () => {
      await client.xgroup_create(key, groupName, 0, true);
    },
    ErrorReplyError,
    "-BUSYGROUP Consumer Group name already exists",
  );

  assertEquals(await client.xgroup_destroy(key, groupName), 1);
});

suite.test("xgroup setid and delconsumer", async () => {
  const key = randomStream();
  const group = "test-group";
  const consumer = "test-consumer";

  const created = await client.xgroup_create(key, group, "$", true);
  assertEquals(created, "OK");

  const addedId = await client.xadd(key, "*", { anyfield: "anyval" });

  assert(addedId);

  //  must read from a given stream to create the
  //  consumer
  const xid = ">";
  const data = await client.xreadgroup([{ key, xid }], { group, consumer });

  assertEquals(data.length, 1);

  assertEquals(await client.xgroup_setid(key, group, 0), "OK");

  assertEquals(await client.xgroup_delconsumer(key, group, consumer), 1);

  await cleanupStream(client, key);
});

suite.test("xreadgroup but no ack", async () => {
  const key = randomStream();
  const group = "test-group";

  const created = await client.xgroup_create(key, group, "$", true);
  assertEquals(created, "OK");

  const addedId = await client.xadd(key, "*", { anyfield: "anyval" });

  assert(addedId);

  const xid = ">";
  const dataOut = await client.xreadgroup([{ key, xid }], {
    group,
    consumer: "test-consumer",
  });

  assertEquals(dataOut.length, 1);
  const actualFirstStream = dataOut[0];
  assertEquals(actualFirstStream.key, key);
  assertEquals(actualFirstStream.messages[0].xid, addedId);
  assertEquals(actualFirstStream.messages.length, 1);
  assertEquals(
    actualFirstStream.messages[0].field_values.get("anyfield"),
    "anyval",
  );

  // > symbol does NOT cause automatic acknowledgement by Redis
  const ackSize = await client.xack(key, group, addedId);
  assertEquals(ackSize, 1);

  assertEquals(await client.xgroup_destroy(key, group), 1);

  await cleanupStream(client, key);
});

suite.test("xack", async () => {
  const key = randomStream();
  const group = "test-group";

  const created = await client.xgroup_create(key, group, "$", true);
  assertEquals(created, "OK");

  const addedId = await client.xadd(key, "*", { anyfield: "anyval" });

  assert(addedId);

  const xid = ">";
  // read but DO NOT auto-ack, which places
  // the message on the PEL
  await client.xreadgroup([{ key, xid }], { group, consumer: "test-consumer" });

  const acked = await client.xack(key, group, addedId);

  assertEquals(acked, 1);

  assertEquals(await client.xgroup_destroy(key, group), 1);
  await cleanupStream(client, key);
});

suite.test("xadd with map then xread", async () => {
  const m = new Map<string, string>();
  m.set("zoo", "theorize");
  m.set("gable", "train");

  const key = randomStream();
  const addedId = await client.xadd(key, "*", m);
  assert(addedId !== null);

  // one millis before now
  const xid = addedId.unixMs - 1;
  const v = await client.xread([{ key, xid }], { block: 5000, count: 500 });

  assert(v != null);

  const expectedMap = new Map();
  expectedMap.set("zoo", "theorize");
  expectedMap.set("gable", "train");

  assertEquals(v, [
    {
      key,
      messages: [
        {
          xid: addedId,
          field_values: expectedMap,
        },
      ],
    },
  ]);

  await cleanupStream(client, key);
});

suite.test("xadd with maxlen on map then xread", async () => {
  const mmm = new Map<string, string>();
  mmm.set("hop", "4");
  mmm.set("blip", "5");

  const key = randomStream();
  const addedId = await client.xadd(key, "*", mmm, { elements: 8 });
  assert(addedId !== null);

  const justBefore = addedId.unixMs - 1;

  const v = await client.xread([{ key, xid: justBefore }], {
    block: 5000,
    count: 500,
  });

  assert(v != null);

  const expectedMap = new Map();
  expectedMap.set("hop", "4");
  expectedMap.set("blip", "5");

  assertEquals(v, [
    { key, messages: [{ xid: addedId, field_values: expectedMap }] },
  ]);

  await cleanupStream(client, key);
});

suite.test("xdel", async () => {
  const key = randomStream();
  const id0 = await client.xadd(key, "*", { foo: "bar" }, { elements: 10 });
  const id1 = await client.xadd(key, "*", { foo: "baz" }, { elements: 10 });
  const id2 = await client.xadd(key, "*", { foo: "qux" }, { elements: 10 });

  const v = await client.xdel(key, id0, id1, id2);
  assert(v === 3);
  await cleanupStream(client, key);
});

suite.test("xlen", async () => {
  const key = randomStream();
  await client.xadd(key, "*", { foo: "qux" }, { elements: 5 });
  await client.xadd(key, "*", { foo: "bux" }, { elements: 5 });

  const v = await client.xlen(key);
  assert(v === 2);
  await cleanupStream(client, key);
});

suite.test("unique message per consumer", async () => {
  await withConsumerGroup(async (key, group) => {
    const addedIds = [];
    const c0 = "consumer-0";
    const c1 = "consumer-1";
    const c2 = "consumer-2";

    for (const consumer of [c0, c1, c2]) {
      const payload = `data-for-${consumer}`;
      const a = await client.xadd(key, "*", { target: payload });
      assert(a);
      addedIds.push(a);

      // This special  ID means that you want all
      // "new" messages in the stream.
      const xid = ">";
      const data = await client.xreadgroup([{ key, xid }], { group, consumer });

      assertEquals(data[0].messages.length, 1);

      assertEquals(data[0].messages[0].field_values.get("target"), payload);
    }

    await cleanupStream(client, key);
  });
});

suite.test(
  "broadcast pattern, all groups read their own version of the stream",
  async () => {
    const key = randomStream();
    const group0 = "tg0";
    const group1 = "tg1";
    const group2 = "tg2";
    const groups = [group0, group1, group2];

    for (const g of groups) {
      const created = await client.xgroup_create(key, g, "$", true);
      assertEquals(created, "OK");
    }

    const addedIds = [];

    let msgCount = 0;
    for (const group of groups) {
      const payload = `data-${msgCount}`;
      const a = await client.xadd(key, "*", { target: payload });
      assert(a);
      addedIds.push(a);
      msgCount++;

      const consumer = "someconsumer";
      const xid = ">";
      const data = await client.xreadgroup([{ key, xid }], { group, consumer });

      // each group should see ALL the messages
      // that have been emitted
      const toCheck = data[0].messages;
      assertEquals(toCheck.length, msgCount);
    }

    for (const g of groups) {
      assertEquals(await client.xgroup_destroy(key, g), 1);
    }

    await cleanupStream(client, key);
  },
);

suite.test("xrange and xrevrange", async () => {
  const key = randomStream();
  const firstId = await client.xadd(key, "*", { f: "v0" });
  const basicResult = await client.xrange(key, "-", "+");
  assertEquals(basicResult.length, 1);
  assertEquals(basicResult[0].xid, firstId);
  assertEquals(basicResult[0].field_values.get("f"), "v0");

  const secondId = await client.xadd(key, "*", { f: "v1" });
  const revResult = await client.xrevrange(key, "+", "-");

  assertEquals(revResult.length, 2);
  assertEquals(revResult[0].xid, secondId);
  assertEquals(revResult[0].field_values.get("f"), "v1");
  assertEquals(revResult[1].xid, firstId);
  assertEquals(revResult[1].field_values.get("f"), "v0");

  // count should limit results
  const lim = await client.xrange(key, "-", "+", 1);
  assertEquals(lim.length, 1);
  const revLim = await client.xrevrange(key, "+", "-", 1);
  assertEquals(revLim.length, 1);

  await cleanupStream(client, key);
});

suite.test("xclaim and xpending, all options", async () => {
  await withConsumerGroup(async (key, group) => {
    // xclaim test basic idea:
    // 1. add messages to a group
    // 2. then xreadgroup needs to define a consumer and read pending
    //    messages without acking them
    // 3. then we need to sleep 5ms and call xpending
    // 4. from here we should be able to claim message
    //    past the idle time and read them from a different consumer

    await Promise.all([
      client.xadd(key, 1000, { field: "foo" }),
      client.xadd(key, 2000, { field: "bar" }),
    ]);

    const initialConsumer = "someone";

    const firstReply = await client.xreadgroup([{ key, xid: ">" }], {
      group,
      consumer: initialConsumer,
    });

    const firstPending = await client.xpending(key, group);

    await delay(50);

    assertEquals(firstPending.count, 2);
    assertNotEquals(firstPending.startId, firstPending.endId);
    assertEquals(firstPending.consumers.length, 1);
    assertEquals(firstPending.consumers[0].name, "someone");
    assertEquals(firstPending.consumers[0].pending, 2);

    const minIdleTime = 4;

    // minimum options
    const claimingConsumer = "responsible-process";
    const firstClaimed = await client.xclaim(
      key,
      { group, consumer: claimingConsumer, minIdleTime },
      1000,
      2000,
    );
    assert(firstClaimed.kind === "messages");
    assertEquals(firstClaimed.messages.length, 2);
    assertEquals(
      firstClaimed.messages[0].field_values,
      new Map(Object.entries({ field: "foo" })),
    );
    assertEquals(
      firstClaimed.messages[1].field_values,
      new Map(Object.entries({ field: "bar" })),
    );

    // ACK these messages so we can try XPENDING/XCLAIM
    // on a new batch
    await client.xack(key, group, ...firstReply[0].messages.map((m) => m.xid));

    // Let's write some more messages and try
    // other formats of XPENDING/XCLAIM
    await Promise.all([
      client.xadd(key, 3000, { field: "foo" }),
      client.xadd(key, [3000, 1], { field: "bar" }),
      client.xadd(key, [3000, 2], { field: "baz" }),
    ]);

    const secondReply = await client.xreadgroup([{ key, xid: ">" }], {
      group,
      consumer: initialConsumer,
    });

    // take a short nap and increase the lastDeliveredMs
    await delay(50);

    // try another form of xpending: counts for all consumers (we have only one)
    const secondPending = await client.xpending_count(key, group, {
      start: "-",
      end: "+",
      count: 10,
    });
    assertEquals(secondPending.length, 3);
    for (const info of secondPending) {
      assertEquals(info.owner, "someone");
      assert(info.lastDeliveredMs > 4);
      // We called XREADGROUP so it was delivered once
      // (but not acknowledged yet!)
      assertEquals(info.timesDelivered, 1);
    }

    // the output for justIDs will have a different shape
    const secondClaimedXIds = await client.xclaim(
      key,
      { group, consumer: claimingConsumer, minIdleTime, justXId: true },
      [3000, 0],
      [3000, 1],
      [3000, 2],
    );

    assert(secondClaimedXIds.kind === "justxid");
    assertEquals(secondClaimedXIds.xids, [
      { unixMs: 3000, seqNo: 0 },
      { unixMs: 3000, seqNo: 1 },
      { unixMs: 3000, seqNo: 2 },
    ]);

    // ACK these messages so we can try XPENDING/XCLAIM
    // on a new batch
    await client.xack(key, group, ...secondReply[0].messages.map((m) => m.xid));

    // We'll try one other set of options
    // for each of XPENDING and XCLAIM
    await Promise.all([
      client.xadd(key, 4000, { field: "woof", farm: "chicken" }),
      client.xadd(key, 5000, { field: "bop", farm: "duck" }),
    ]);

    await client.xreadgroup([{ key, xid: ">" }], {
      group,
      consumer: initialConsumer,
    });

    // This record won't be included in the filtered
    // form of XPENDING, below.
    await client.xadd(key, "*", { field: "no" });
    await client.xreadgroup([{ key, xid: ">" }], {
      group,
      consumer: "weird-interloper",
    });

    await delay(50);

    // try another form of xpending: counts
    // efficiently filtered down to a single consumer.
    // We expect to see two of the three outstanding
    // messages here, since one was claimed by
    // weird-interloper.
    const thirdPending = await client.xpending_count(
      key,
      group,
      { start: "-", end: "+", count: 10 },
      "someone",
    );
    assertEquals(thirdPending.length, 2);
    for (const info of thirdPending) {
      assertEquals(info.owner, "someone");
      assert(info.lastDeliveredMs > 4);
      // We called XREADGROUP so it was delivered once
      // (but not acknowledged yet!)
      assertEquals(info.timesDelivered, 1);
    }

    // make sure all the other options can be passed to redis
    // without some sort of disaster occurring.
    const thirdClaimed = await client.xclaim(
      key,
      {
        group,
        consumer: claimingConsumer,
        minIdleTime,
        retryCount: 6,
        force: true,
      },
      4000,
      5000,
    );
    assert(thirdClaimed.kind === "messages");
    assertEquals(thirdClaimed.messages.length, 2);
    assertEquals(
      thirdClaimed.messages[0].field_values,
      new Map(Object.entries({ field: "woof", farm: "chicken" })),
    );
    assertEquals(
      thirdClaimed.messages[1].field_values,
      new Map(Object.entries({ field: "bop", farm: "duck" })),
    );
  });
});

suite.test("xinfo", async () => {
  await withConsumerGroup(async (key, group) => {
    await client.xadd(key, 1, { hello: "no" });
    await client.xadd(key, 2, { hello: "yes" });

    const basicStreamInfo = await client.xinfo_stream(key);
    assertEquals(basicStreamInfo.length, 2);
    assertEquals(basicStreamInfo.groups, 1);
    assert(basicStreamInfo.radixTreeKeys > 0);
    assert(basicStreamInfo.radixTreeNodes > 0);
    assertEquals(basicStreamInfo.lastGeneratedId, { unixMs: 2, seqNo: 0 });
    assertEquals(basicStreamInfo.firstEntry, {
      xid: { unixMs: 1, seqNo: 0 },
      field_values: new Map(Object.entries({ hello: "no" })),
    });
    assertEquals(basicStreamInfo.lastEntry, {
      xid: { unixMs: 2, seqNo: 0 },
      field_values: new Map(Object.entries({ hello: "yes" })),
    });

    // Let's do an XREADGROUP so that we see some entries in the PEL
    const _ = client.xreadgroup([[key, ">"]], { group, consumer: "someone" });

    const fullStreamInfo = await client.xinfo_stream_full(key);
    assertEquals(fullStreamInfo.length, 2);
    assert(fullStreamInfo.radixTreeKeys > 0);
    assert(fullStreamInfo.radixTreeNodes > 0);
    assertEquals(fullStreamInfo.groups.length, 1);
    assertEquals(fullStreamInfo.groups[0].consumers.length, 1);

    const cc = fullStreamInfo.groups[0].consumers[0];
    assertEquals(cc.name, "someone");
    assert(cc.seenTime > 0);
    assertEquals(cc.pelCount, 2);
    assertEquals(cc.pending.length, 2);
    for (const msg of cc.pending) {
      assertEquals(msg.timesDelivered, 1);
    }
    assertEquals(fullStreamInfo.entries.length, 2);

    const limitWithCount = await client.xinfo_stream_full(key, 1);
    assertEquals(limitWithCount.length, 2);
    assert(limitWithCount.radixTreeKeys > 0);
    assert(limitWithCount.radixTreeNodes > 0);
    assertEquals(limitWithCount.groups.length, 1);
    assertEquals(limitWithCount.groups[0].consumers.length, 1);

    const c = limitWithCount.groups[0].consumers[0];
    assertEquals(c.name, "someone");
    assert(c.seenTime > 0);
    assertEquals(c.pelCount, 2);
    // The COUNT option limits this array to a single entry!
    assertEquals(c.pending.length, 1);
    for (const msg of c.pending) {
      assertEquals(msg.timesDelivered, 1);
    }
    // The COUNT option limits this array to a single entry!
    assertEquals(limitWithCount.entries.length, 1);

    // Let's make another group and see more stats
    await client.xgroup_create(key, "newgroup", "$", true);

    const groupInfos = await client.xinfo_groups(key);
    assertEquals(groupInfos.length, 2);

    const newGroup = groupInfos.find((g) => g.name === "newgroup");
    const oldGroup = groupInfos.find((g) => g.name === group);
    assert(newGroup);
    assert(oldGroup);

    assertEquals(oldGroup.pending, 2);
    assertEquals(newGroup.pending, 0);

    // Add one more record and read it with a new consumer,
    // so that we can check the parsing of deno-redis xinfo_consumers
    await client.xadd(key, "*", { hello: "maybe" });
    await client.xreadgroup([[key, ">"]], { group, consumer: "newbie" });

    // Increase the idle time by falling asleep
    await delay(10);
    const consumerInfos = await client.xinfo_consumers(key, group);
    assertEquals(consumerInfos.length, 2);
    const newConsumer = consumerInfos.find((c) => c.name === "newbie");
    const oldConsumer = consumerInfos.find((c) => c.name === "someone");
    assert(newConsumer);
    assert(oldConsumer);
    assert(newConsumer.idle > 1);
    assert(oldConsumer.idle > 1);
    // New consumer read one message with ">"
    assertEquals(newConsumer.pending, 1);
    // Old consumer read two messages with ">"
    assertEquals(oldConsumer.pending, 2);

    assertEquals(await client.xgroup_destroy(key, "newgroup"), 1);
  });
});

suite.runTests();
