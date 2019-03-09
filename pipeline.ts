import { BufReader, BufWriter } from "https://deno.land/std@v0.3.1/io/bufio.ts";
import { createRequest, readReply, RedisRawReply } from "./io.ts";
import { ErrorReplyError } from "./errors.ts";
import { create, Redis } from "./redis.ts";

const encoder = new TextEncoder();
export type RedisPipeline = {
  enqueue(command: string, ...args);
  flush(): Promise<RedisRawReply[]>;
} & Redis;

export function createRedisPipeline(
  writer: BufWriter,
  reader: BufReader,
  opts?: { tx: true }
): RedisPipeline {
  let queue = [];
  const executor = {
    enqueue(command: string, ...args) {
      const msg = createRequest(command, ...args);
      queue.push(msg);
    },
    async flush() {
      // wrap pipelined commands with MULTI/EXEC
      if (opts && opts.tx) {
        queue.splice(0, 0, createRequest("MULTI"));
        queue.push(createRequest("EXEC"));
      }
      const msg = queue.join("");
      await writer.write(encoder.encode(msg));
      await writer.flush();
      const ret = [];
      for (let i = 0; i < queue.length; i++) {
        try {
          const rep = await readReply(reader);
          ret.push(rep);
        } catch (e) {
          if (e.constructor === ErrorReplyError) {
            ret.push(e);
          } else {
            throw e;
          }
        }
      }
      queue = [];
      return ret;
    },
    async execRawReply(
      command: string,
      ...args: (string | number)[]
    ): Promise<RedisRawReply> {
      this.enqueue(command, ...args);
      return ["status", "OK"];
    }
  };
  const fakeRedis = create(null, null, null, executor);
  return Object.assign(fakeRedis, executor);
}
