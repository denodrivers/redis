import { assertEquals, assertRejects } from "../../deps/std/assert.ts";
import { BufReader, readerFromStreamReader } from "../../deps/std/io.ts";
import { ErrorReplyError } from "../../errors.ts";
import { readReply } from "./reply.ts";

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
  },
});
