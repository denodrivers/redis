import { Redis } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/delay.ts";
import {
  assert,
  assertEquals,
  assertRejects,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("client");
const port = nextPort();
const server = await startRedis({ port });
let client: Redis;

suite.beforeEach(async () => {
  client = await newClient({ hostname: "127.0.0.1", port });
});

suite.afterEach(() => {
  client.close();
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("client caching with opt in", async () => {
  await client.clientTracking({ mode: "ON", optIn: true });
  assertEquals(await client.clientCaching("YES"), "OK");
});

suite.test("client caching with opt out", async () => {
  await client.clientTracking({ mode: "ON", optOut: true });
  assertEquals(await client.clientCaching("NO"), "OK");
});

suite.test("client caching without opt in or opt out", async () => {
  await assertRejects(
    () => {
      return client.clientCaching("YES");
    },
    Error,
    "-ERR CLIENT CACHING can be called only when the client is in tracking mode with OPTIN or OPTOUT mode enabled",
  );
});

suite.test("client id", async () => {
  const id = await client.clientID();
  assertEquals(typeof id, "number");
});

suite.test("client info", async () => {
  const id = await client.clientID();
  const info = await client.clientInfo();
  assert(info!.includes(`id=${id}`));
});

suite.test("client setname & getname", async () => {
  assertEquals(await client.clientSetName("deno-redis"), "OK");
  assertEquals(await client.clientGetName(), "deno-redis");
});

suite.test("client getredir with no redirect", async () => {
  assertEquals(await client.clientGetRedir(), -1);
});

suite.test("client getredir with redirect", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port });
  try {
    const id = await tempClient.clientID();
    await client.clientTracking({ mode: "ON", redirect: id });
    assertEquals(await client.clientGetRedir(), id);
  } finally {
    tempClient.close();
  }
});

suite.test("client pause & unpause", async () => {
  assertEquals(await client.clientPause(5), "OK");
  assertEquals(await client.clientPause(5, "ALL"), "OK");
  assertEquals(await client.clientPause(5, "WRITE"), "OK");
  assertEquals(await client.clientUnpause(), "OK");
});

suite.test("client kill by addr", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port });
  try {
    const info = await client.clientInfo() as string;
    const addr = info.split(" ").find((s) =>
      s.startsWith("addr=")
    )!.split("=")[1];
    assertEquals(await tempClient.clientKill({ addr }), 1);
  } finally {
    tempClient.close();
  }
});

suite.test("client kill by id", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port });
  try {
    const id = await client.clientID();
    assertEquals(await tempClient.clientKill({ id }), 1);
  } finally {
    tempClient.close();
  }
});

suite.test("client kill by type and don't skip ourselves", async () => {
  assertEquals(await client.clientKill({ type: "NORMAL", skipme: "NO" }), 1);
});

suite.test("client list", async () => {
  const id = await client.clientID();
  let list = await client.clientList();
  assert(list!.includes(`id=${id}`));

  list = await client.clientList({ type: "PUBSUB" });
  assertEquals(list, "");

  list = await client.clientList({ type: "NORMAL" });
  assert(list!.includes(`id=${id}`));

  list = await client.clientList({ ids: [id] });
  assert(list!.includes(`id=${id}`));

  await assertRejects(
    () => {
      return client.clientList({ type: "MASTER", ids: [id] });
    },
    Error,
    "only one of `type` or `ids` can be specified",
  );
});

suite.test("client tracking", async () => {
  assertEquals(
    await client.clientTracking({
      mode: "ON",
      prefixes: ["foo", "bar"],
      bcast: true,
    }),
    "OK",
  );
  assertEquals(
    await client.clientTracking({
      mode: "ON",
      bcast: true,
      optIn: false,
      noLoop: true,
    }),
    "OK",
  );
  await assertRejects(
    () => {
      return client.clientTracking({ mode: "ON", bcast: true, optIn: true });
    },
    Error,
    "-ERR OPTIN and OPTOUT are not compatible with BCAST",
  );
});

suite.test("client trackinginfo", async () => {
  const info = await client.clientTrackingInfo();
  assert(info.includes("flags"));
  assert(info.includes("redirect"));
  assert(info.includes("prefixes"));
});

suite.test("client unblock nothing", async () => {
  const id = await client.clientID();
  assertEquals(await client.clientUnblock(id), 0);
});

suite.test("client unblock with timeout", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port });
  try {
    const id = await tempClient.clientID();
    tempClient.brpop(0, "key1"); // Block.
    await delay(5); // Give some leeway for brpop to reach redis.
    assertEquals(await client.clientUnblock(id, "TIMEOUT"), 1);
  } finally {
    tempClient.close();
  }
});

suite.test("client unblock with error", async () => {
  const tempClient = await newClient({ hostname: "127.0.0.1", port });
  try {
    const id = await tempClient.clientID();
    await assertRejects(
      () => tempClient.brpop(0, "key1"),
      Error,
      "-UNBLOCKED",
    );
    await delay(5); // Give some leeway for brpop to reach redis.
    assertEquals(await client.clientUnblock(id, "ERROR"), 1);
  } finally {
    tempClient.close();
  }
});

suite.runTests();
