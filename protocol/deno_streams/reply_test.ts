import { assertEquals, assertRejects } from "../../deps/std/assert.ts";
import { BufReader, readerFromStreamReader } from "../../deps/std/io.ts";
import { ErrorReplyError } from "../../errors.ts";
import { readReply } from "./reply.ts";
import type { RedisReply } from "../shared/types.ts";

Deno.test({
  name: "readReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("array", async () => {
      const encoder = new TextEncoder();
      const rawReply = "*4\r\n$3\r\nfoo\r\n_\r\n(123456789\r\n:456\r\n";
      const readable = ReadableStream.from([encoder.encode(rawReply)]);
      const reader = readable.getReader();
      const reply = await readReply(
        BufReader.create(readerFromStreamReader(reader)),
      );
      assertEquals(reply, ["foo", null, "123456789", 456]);
    });

    await t.step("blob error", async () => {
      const encoder = new TextEncoder();
      const rawReply = "!21\r\nSYNTAX invalid syntax\r\n_\r\n";
      const readable = ReadableStream.from([encoder.encode(rawReply)]);
      const reader = readable.getReader();
      const buf = BufReader.create(readerFromStreamReader(reader));
      await assertRejects(
        () => readReply(buf),
        ErrorReplyError,
        "SYNTAX invalid syntax",
      );

      assertEquals(await readReply(buf), null);
    });

    await t.step("attribute", async () => {
      const encoder = new TextEncoder();
      const cases: Array<[given: string, expected: RedisReply]> = [
        [
          "|1\r\n+foo\r\n%2\r\n$3\r\nbar\r\n:123\r\n$1\r\na\r\n,1.23\r\n+Hello World\r\n",
          "Hello World",
        ],
        [
          "*3\r\n:123\r\n|2\r\n+foo\r\n:1\r\n+bar\r\n:45\r\n+str\r\n,1.23\r\n",
          [123, "str", "1.23"],
        ],
      ];

      for (
        const [given, expected] of cases
      ) {
        const readable = ReadableStream.from([encoder.encode(given)]);
        const reader = readable.getReader();
        const buf = BufReader.create(readerFromStreamReader(reader));
        const actual = await readReply(buf);
        assertEquals(actual, expected);
      }
    });
  },
});
