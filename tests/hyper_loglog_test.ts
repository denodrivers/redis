import { makeTest } from "./test_util.ts";
import {
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";

const { test, client } = await makeTest("hll");

test("pdfadd", async () => {
  assertEquals(await client.pfadd("hll", "a", "b", "c", "d"), 1);
});
test("pdfcount", async () => {
  await client.pfadd("hll", "a", "b", "c", "d");
  assertEquals(await client.pfcount("hll"), 4);
});
test("pfmerge", async () => {
  await client.pfadd("hll", "a", "b", "c", "d");
  await client.pfadd("hll2", "1", "2", "3", "4");
  assertEquals(await client.pfmerge("hll", "hll2"), "OK");
});
