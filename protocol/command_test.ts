import { encodeRequest } from "./command.ts";
import { assertEquals } from "../vendor/https/deno.land/std/assert/mod.ts";

Deno.test({
  name: "encodeRequest",
  permissions: "none",
  fn: () => {
    const actual = encodeRequest("SET", ["name", "bar"]);
    const expected = new TextEncoder().encode("*3\r\n$3\r\nSET\r\n$4\r\nname\r\n$3\r\nbar\r\n");
    assertEquals(actual, expected);
  }
});
