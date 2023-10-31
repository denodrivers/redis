import { assertEquals } from "../../vendor/https/deno.land/std/assert/mod.ts";
import { RESPStream } from "./resp_stream.ts";

Deno.test("RESPStream", async (t) => {
  await t.step("readReply()", async () => {
    // TODO: refactor this test case
    let closed = false;
    const connBase = {
      localAddr: {
        transport: "tcp" as const,
        hostname: "127.0.0.1",
        port: 40000,
      },
      remoteAddr: {
        transport: "tcp" as const,
        hostname: "127.0.0.1",
        port: 6379,
      },
      close: () => {
        if (closed) throw new Deno.errors.BadResource();
        closed = true;
      },
      closeWrite: () => {
        throw new Error("`closeWrite()` should not be called");
      },
      read: () => {
        if (closed) throw new Deno.errors.BadResource();
        throw new Error("`read()` should not be called");
      },
      write: () => {
        if (closed) throw new Deno.errors.BadResource();
        throw new Error("`write()` should not be called");
      },
      ref: () => {
        if (closed) throw new Deno.errors.BadResource();
        throw new Error("`ref()` should not be called");
      },
      unref: () => {
        if (closed) throw new Deno.errors.BadResource();
        throw new Error("`unref()` should not be called");
      },
      rid: 1,
    };
    const encoder = new TextEncoder();
    const conn: Deno.Conn = {
      ...connBase,
      readable: new ReadableStream<Uint8Array>({
        pull(controller) {
          // (1) Bulk reply
          controller.enqueue(encoder.encode("$6\r\nfoobar\r\n"));

          // (2) Simple string reply
          controller.enqueue(encoder.encode("+OK\r\n"));

          // (3) Integer reply
          controller.enqueue(encoder.encode(":567\r\n"));

          // (4) Array reply
          controller.enqueue(
            encoder.encode(
              "*3\r\n$5\r\nhello\r\n*2\r\n:123\r\n*1\r\n+OK\r\n:4567\r\n",
            ),
          );

          // (5) Imcomplete bulk reply
          controller.enqueue(encoder.encode("$3\r"));
          controller.enqueue(encoder.encode("\nf"));
          controller.enqueue(encoder.encode("oo\r\n"));

          // (6) Integer reply
          controller.enqueue(encoder.encode(":98765\r\n"));

          // (7) Imcomplete array reply
          controller.enqueue(encoder.encode("*2\r"));
          controller.enqueue(encoder.encode("\n:1"));
          controller.enqueue(encoder.encode("23\r"));
          controller.enqueue(encoder.encode("\n+OK\r\n"));
        },
      }),
      writable: new WritableStream({
        write(_, controller) {
          controller.error(new Error("Not supported"));
        },
      }),
    };
    const stream = new RESPStream(conn);
    try {
      // (1)
      assertEquals(await stream.readReply(), "foobar");
      // (2)
      assertEquals(await stream.readReply(), "OK");
      // (3)
      assertEquals(await stream.readReply(), 567);
      // (4)
      assertEquals(await stream.readReply(), ["hello", [123, ["OK"]], 4567]);
      // (5)
      assertEquals(await stream.readReply(), "foo");
      // (6)
      assertEquals(await stream.readReply(), 98765);
      // (7)
      assertEquals(await stream.readReply(), [123, "OK"]);
    } finally {
      stream.close();
    }
  });
});
