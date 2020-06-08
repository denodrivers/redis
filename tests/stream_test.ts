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

test("xaddMaxlen", async () => {
  const v = await client.xaddMaxlen(
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
  const x = await client.xaddMaxlen(
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
  const a = await client.xaddMaxlen(
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
  const b = await client.xaddMaxlen(
    "key2",
    { elements: 10 },
    "1000-0",
    "air",
    "ball",
    "friend",
    "table",
  );
  const c = await client.xaddMaxlen(
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

test("xdel", async () => {
  const id0 = await client.xaddMaxlen(
    "key3",
    { elements: 10 },
    "*",
    "foo",
    "bar",
  );
  const id1 = await client.xaddMaxlen(
    "key3",
    { elements: 10 },
    "*",
    "foo",
    "baz",
  );
  const id2 = await client.xaddMaxlen(
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
  await client.xaddMaxlen("key3", { elements: 5 }, "*", "foo", "qux");
  await client.xaddMaxlen("key3", { elements: 5 }, "*", "foo", "bux");

  const v = await client.xlen("key3");
  assert(v === 2);
});

// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
// TODO think about cleanup// TODO think about cleanup
