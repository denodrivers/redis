import {
  assertEquals,
  assert,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client } = await makeTest("script");
test("eval", async () => {
  const raw = await client.eval(
    "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}",
    2,
    ["1", "2"],
    ["3", "4"],
  );
  assert(Array.isArray(raw));
  assertEquals(raw, ["1", "2", "3", "4"]);
});
