import { assertEquals } from "../../deps/std/assert.ts";
import { BufReader, readerFromStreamReader } from "../../deps/std/io.ts";
import { readReply } from "./reply.ts";

Deno.test({
  name: "readReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("array", async () => {
      const encoder = new TextEncoder();
      const rawReply = "*3\r\n$3\r\nfoo\r\n_\r\n:456\r\n";
      const readable = ReadableStream.from([encoder.encode(rawReply)]);
      const reader = readable.getReader();
      const reply = await readReply(
        BufReader.create(readerFromStreamReader(reader)),
      );
      assertEquals(reply, ["foo", null, 456]);
    });
  },
});
