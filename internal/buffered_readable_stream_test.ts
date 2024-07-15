import { encoder } from "./encoding.ts";
import {
  assertEquals,
  assertRejects,
} from "../deps/std/assert.ts";
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
      await assertRejects(() => buffered.readLine(), Deno.errors.BadResource);
    });

    await t.step("readN", async () => {
      const readable = createReadableStreamFromString(
        "$12\r\nhello_world!\r\n",
      );
      const buffered = new BufferedReadableStream(readable);

      await buffered.readN(0);
      assertEquals(decoder.decode(await buffered.readLine()), "$12\r\n");

      {
        const buf = await buffered.readN(5);
        assertEquals(decoder.decode(buf), "hello");
      }

      await buffered.readN(0);

      {
        const buf = await buffered.readN(7);
        assertEquals(decoder.decode(buf), "_world!");
      }

      await buffered.readN(0);

      {
        const buf = await buffered.readN(2);
        assertEquals(decoder.decode(buf), "\r\n");
      }

      await buffered.readN(0);
      await assertRejects(
        () => buffered.readN(1),
        Deno.errors.BadResource,
      );
    });

    await t.step(
      "`readN` should not throw `RangeError: offset is out of bounds` error",
      async () => {
        const readable = new ReadableStream({
          type: "bytes",
          start(controller) {
            controller.enqueue(encoder.encode("foobar"));
            controller.close();
          },
        });
        const buffered = new BufferedReadableStream(readable);
        {
          const buf = await buffered.readN(3);
          assertEquals(decoder.decode(buf), "foo");
        }

        {
          const buf = await buffered.readN(1);
          assertEquals(decoder.decode(buf), "b");
        }

        await buffered.readN(0);
        {
          const buf = await buffered.readN(2);
          assertEquals(decoder.decode(buf), "ar");
        }
      },
    );
  },
});

function createReadableStreamFromString(s: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let numRead = 0;
  return new ReadableStream({
    type: "bytes",
    pull(controller) {
      controller.enqueue(encoder.encode(s[numRead]));
      numRead++;
      if (numRead >= s.length) {
        controller.close();
      }
    },
  });
}
