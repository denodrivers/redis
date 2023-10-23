import {
  assert,
  assertEquals,
  assertFalse,
} from "../vendor/https/deno.land/std/assert/mod.ts";
import { readLine, readReply } from "./reply.ts";

Deno.test({
  name: "readLine",
  permissions: "none",
  fn: async () => {
    const decoder = new TextDecoder();
    const readable = createReadableByteStream("$11\r\nhello_world\r\n");
    const reader = readable.getReader();

    {
      const res = await readLine(reader);
      assertFalse(res.done);
      assertEquals(decoder.decode(res.value), "$11");
    }

    {
      const res = await readLine(reader);
      assertFalse(res.done);
      assertEquals(decoder.decode(res.value), "hello_world");
    }

    {
      const res = await readLine(reader);
      assert(res.done);
    }

    assert(readable.locked);
  },
});

Deno.test({
  name: "readReply",
  permissions: "none",
  fn: async (t) => {
    await t.step("blob", async () => {
      const readable = createReadableByteStream("$6\r\nfoobar\r\n");
      const reply = await readReply(readable);
      assertEquals(reply, "foobar");
      assertFalse(readable.locked);
    });

    await t.step("simple string", async () => {
      const readable = createReadableByteStream("+OK\r\n");
      const reply = await readReply(readable);
      assertEquals(reply, "OK");
      assertFalse(readable.locked);
    });

    await t.step("integer", async () => {
      const readable = createReadableByteStream(":1234\r\n");
      const reply = await readReply(readable);
      assertEquals(reply, 1234);
      assertFalse(readable.locked);
    });

    await t.step("array", async () => {
      const readable = createReadableByteStream(
        "*3\r\n$3\r\nfoo\r\n*2\r\n:456\r\n+OK\r\n:78\r\n",
      );
      const reply = await readReply(readable);
      assertEquals(reply, ["foo", [456, "OK"], 78]);
      assertFalse(readable.locked);
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
