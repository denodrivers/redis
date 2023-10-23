import { encoder } from "../protocol/_util.ts";
import {
  assertEquals,
  assertFalse,
  assertRejects,
} from "../vendor/https/deno.land/std/assert/mod.ts";
import { BufferedReadableStream } from "./buffered_readable_stream.ts";

Deno.test({
  name: "BufferedReadableStream",
  permissions: "none",
  fn: async (t) => {
    const decoder = new TextDecoder();
    await t.step("readLine", async () => {
      const readable = createReadableStreamFromString(
        "*2\r\n$5\r\nhello\r\n:1234\r\n",
      );
      const buffered = new BufferedReadableStream(readable);
      assertEquals(decoder.decode(await buffered.readLine()), "*2\r\n");
      assertEquals(decoder.decode(await buffered.readLine()), "$5\r\n");
      assertEquals(decoder.decode(await buffered.readLine()), "hello\r\n");
      assertEquals(decoder.decode(await buffered.readLine()), ":1234\r\n");
      await assertRejects(() => buffered.readLine(), Deno.errors.UnexpectedEof);
      assertFalse(readable.locked);
    });

    await t.step("readFull", async () => {
      const readable = createReadableStreamFromString(
        "$12\r\nhello_world!\r\n",
      );
      const buffered = new BufferedReadableStream(readable);

      await buffered.readFull(new Uint8Array(0));
      assertEquals(decoder.decode(await buffered.readLine()), "$12\r\n");

      {
        const buf = new Uint8Array(5);
        await buffered.readFull(buf);
        assertEquals(decoder.decode(buf), "hello");
      }

      await buffered.readFull(new Uint8Array(0));

      {
        const buf = new Uint8Array(7);
        await buffered.readFull(buf);
        assertEquals(decoder.decode(buf), "_world!");
      }

      await buffered.readFull(new Uint8Array(0));

      {
        const buf = new Uint8Array(2);
        await buffered.readFull(buf);
        assertEquals(decoder.decode(buf), "\r\n");
      }

      await buffered.readFull(new Uint8Array(0));
      await assertRejects(
        () => buffered.readFull(new Uint8Array(1)),
        Deno.errors.UnexpectedEof,
      );

      assertFalse(readable.locked);
    });

    await t.step(
      "`readFull` should not throw `RangeError: offset is out of bounds` error",
      async () => {
        const readable = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode("foobar"));
            controller.close();
          },
        });
        const buffered = new BufferedReadableStream(readable);
        {
          const buf = new Uint8Array(3);
          await buffered.readFull(buf);
          assertEquals(decoder.decode(buf), "foo");
        }

        {
          const buf = new Uint8Array(1);
          await buffered.readFull(buf);
          assertEquals(decoder.decode(buf), "b");
        }

        await buffered.readFull(new Uint8Array(0));
        {
          const buf = new Uint8Array(2);
          await buffered.readFull(buf);
          assertEquals(decoder.decode(buf), "ar");
        }
      },
    );
  },
});

function createReadableStreamFromString(s: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let numRead = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(encoder.encode(s[numRead]));
      numRead++;
      if (numRead >= s.length) {
        controller.close();
      }
    },
  });
}
