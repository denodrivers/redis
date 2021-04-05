import { assert } from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("RESP3");
const port = nextPort();
const server = await startRedis({ port });
const client = await newClient({ hostname: "127.0.0.1", port });

suite.beforeEach(async () => {
  await client.flushdb();
  await client.hello(2);
});

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("hello", async () => {
  const reply = await client.hello(3);
  assert(Array.isArray(reply));
});
