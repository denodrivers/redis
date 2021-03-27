import { BulkReply, ErrorReplyError, parseURL } from "../mod.ts";
import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("executor");
const server = await startRedis({ port: 7017 });
const opts = { hostname: "127.0.0.1", port: 7017 };
const client = await newClient(opts);

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("simple, string, and integer replies", async () => {
  // simple string
  {
    const reply = await client.executor.exec("SET", "key", "a");
    assertEquals(reply.type, "simple string");
    assertEquals(reply.value(), "OK");
  }

  // bulk string
  {
    const reply = await client.executor.exec("GET", "key");
    assertEquals(reply.type, "bulk string");
    assertEquals(reply.value(), "a");
  }

  // integer
  {
    const reply = await client.executor.exec("EXISTS", "key");
    assertEquals(reply.type, "integer");
    assertEquals(reply.value(), 1);
  }
});

suite.test("get the raw data as Uint8Array", async () => {
  const encoder = new TextEncoder();
  await client.set("key", encoder.encode("hello"));
  const reply = await client.executor.exec("GET", "key");
  assertEquals(reply.type, "bulk string");
  assertEquals((reply as BulkReply).buffer(), encoder.encode("hello"));
});

suite.runTests();
