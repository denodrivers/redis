import { assertEquals } from "../deps/std/assert.ts";
import { concateBytes } from "./concate_bytes.ts";

Deno.test("concateBytes", () => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const e = (s: string) => encoder.encode(s);
  const d = (b: Uint8Array) => decoder.decode(b);

  assertEquals(d(concateBytes(e("foo"), e("bar"))), "foobar");
  assertEquals(d(concateBytes(e(""), e(""))), "");
  assertEquals(d(concateBytes(e(""), e("hello"))), "hello");
});
