import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import {
  newClient,
  nextPort,
  startRedis,
  stopRedis,
  TestSuite,
} from "./test_util.ts";

const suite = new TestSuite("hyperloglog");
const port = nextPort();
const server = await startRedis({ port });
const client = await newClient({ hostname: "127.0.0.1", port });

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("pdfadd", async () => {
  assertEquals(await client.pfadd("hll", "a", "b", "c", "d"), 1);
});

suite.test("pdfcount", async () => {
  await client.pfadd("hll", "a", "b", "c", "d");
  assertEquals(await client.pfcount("hll"), 4);
});

suite.test("pfmerge", async () => {
  await client.pfadd("hll", "a", "b", "c", "d");
  await client.pfadd("hll2", "1", "2", "3", "4");
  assertEquals(await client.pfmerge("hll", "hll2"), "OK");
});

suite.runTests();
