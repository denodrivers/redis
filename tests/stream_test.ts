import { convertMap, parseXMessage } from "../stream.ts";
import { assertEquals } from "../deps/std/assert.ts";
import { describe, it } from "../deps/std/testing.ts";

describe("stream", {
  permissions: "none",
}, () => {
  describe("parseXMessage", () => {
    it("preserves empty-string field names", () => {
      const result = parseXMessage(["1-0", ["", "value"]]);
      assertEquals(result.fieldValues, { "": "value" });
    });

    it("parses non-empty field/value pairs", () => {
      const result = parseXMessage(["1-0", ["foo", "bar", "baz", "qux"]]);
      assertEquals(result.fieldValues, { foo: "bar", baz: "qux" });
    });
  });

  describe("convertMap", () => {
    it("preserves empty-string field names", () => {
      const result = convertMap(["", "value"]);
      assertEquals(result.get(""), "value");
    });

    it("parses non-empty field/value pairs", () => {
      const result = convertMap(["foo", "bar", "baz", "qux"]);
      assertEquals(result.get("foo"), "bar");
      assertEquals(result.get("baz"), "qux");
    });
  });
});
