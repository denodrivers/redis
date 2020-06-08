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
    { elements: 10 },
    "cat",
    "meow",
    "dog",
    "woof",
    "duck",
    "quack",
  );
  assert(v != null);
  const x = await client.xadd(
    "key1",
    "*",
    { approx: true, elements: 10 },
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
  const a = await client.xadd(
    "key1",
    "1000-0",
    { elements: 10 },
    "cat",
    "moo",
    "dog",
    "honk",
    "duck",
    "yodel",
  );
  assert(a != null);
  const b = await client.xadd(
    "key2",
    "1000-0",
    { elements: 10 },
    "air",
    "ball",
    "friend",
    "table",
  );
  const c = await client.xadd(
    "key2",
    "1001-1",
    { elements: 10 },
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
  const id0 = await client.xadd("key3", "*", undefined, "foo", "bar");
  const id1 = await client.xadd("key3", "*", undefined, "foo", "baz");
  const id2 = await client.xadd("key3", "*", undefined, "foo", "qux");

  const v = await client.xdel("key3", id0, id1, id2);
  assert(v === 3);
});
