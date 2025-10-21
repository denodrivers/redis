import { assertEquals } from "../../deps/std/assert.ts";
import { readReply } from "./reply.ts";
import { BufferedReadableStream } from "../../internal/buffered_readable_stream.ts";

Deno.test({
  name: "readReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("blob", async () => {
      const readable = createReadableByteStream("$12\r\nhello\nworld!\r\n");
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, "hello\nworld!");
    });

    await t.step("simple string", async () => {
      const readable = createReadableByteStream("+OK\r\n");
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, "OK");
    });

    await t.step("integer", async () => {
      const readable = createReadableByteStream(":1234\r\n");
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, 1234);
    });

    await t.step("array", async () => {
      const readable = createReadableByteStream(
        "*5\r\n$3\r\nfoo\r\n*2\r\n:456\r\n+OK\r\n_\r\n(123456\r\n:78\r\n",
      );
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, ["foo", [456, "OK"], null, "123456", 78]);
    });

    await t.step("map", async () => {
      const readable = createReadableByteStream(
        "%2\r\n+foo\r\n:1\r\n+bar\r\n:2\r\n",
      );
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, ["foo", 1, "bar", 2]);
    });

    await t.step("set", async () => {
      const readable = createReadableByteStream(
        "~3\r\n+foo\r\n:5\r\n$3\r\nbar\r\n",
      );
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, ["foo", 5, "bar"]);
    });

    await t.step("null", async () => {
      const readable = createReadableByteStream(
        "_\r\n",
      );
      const reply = await readReply(new BufferedReadableStream(readable));
      assertEquals(reply, null);
    });
  },
});

function createReadableByteStream(payload: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let numRead = 0;
  return new ReadableStream({
    type: "bytes",
    pull(controller) {
      if (controller.byobRequest?.view) {
        const view = controller.byobRequest.view;
        const buf = new Uint8Array(
          view.buffer,
          view.byteOffset,
          view.byteLength,
        );
        const remaining = payload.length - numRead;
        const written = Math.min(buf.byteLength, remaining);
        buf.set(encoder.encode(payload.slice(numRead, numRead + written)));
        numRead += written;
        controller.byobRequest.respond(written);
      } else {
        controller.enqueue(encoder.encode(payload[numRead]));
        numRead++;
      }
      if (numRead >= payload.length) {
        controller.close();
      }
    },
  });
}
