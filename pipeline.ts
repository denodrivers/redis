import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import { createRequest, readReply, RedisRawReply, StatusReply } from "./io.ts";
import { ErrorReplyError } from "./errors.ts";
import { create, Redis, CommandFunc, CommandExecutor } from "./redis.ts";
import { deferred, Deferred } from "./vendor/https/deno.land/std/util/async.ts";

const encoder = new TextEncoder();
type OkStatus = string;
export type RedisPipeline = {
  enqueue(command: string, ...args: (number | string)[]): void;
  flush(): Promise<RedisRawReply[]>;
} & Redis<StatusReply, OkStatus, OkStatus, OkStatus, OkStatus, OkStatus>;

export function createRedisPipeline(
  writer: BufWriter,
  reader: BufReader,
  opts?: { tx: true }
): RedisPipeline {
  let commands: string[] = [];
  let queue: {
    commands: string[];
    d: Deferred<RedisRawReply[]>;
  }[] = [];

  function dequeue() {
    const [e] = queue;
    if (!e) return;
    exec(e.commands)
      .then(e.d.resolve)
      .catch(e.d.reject)
      .finally(() => {
        queue.shift();
        dequeue();
      });
  }

  async function exec(cmds: string[]) {
    const msg = cmds.join("");
    await writer.write(encoder.encode(msg));
    await writer.flush();
    const ret: RedisRawReply[] = [];
    for (let i = 0; i < cmds.length; i++) {
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
    return ret;
  }

  function enqueue(command: string, ...args: (number | string)[]): void {
    const msg = createRequest(command, ...args);
    commands.push(msg);
  }
  async function flush(): Promise<RedisRawReply[]> {
    // wrap pipelined commands with MULTI/EXEC
    if (opts && opts.tx) {
      commands.splice(0, 0, createRequest("MULTI"));
      commands.push(createRequest("EXEC"));
    }
    const d = deferred<RedisRawReply[]>();
    queue.push({ commands, d });
    if (queue.length === 1) {
      dequeue();
    }
    commands = [];
    return d;
  }
  function execRawReply(
    command: string,
    ...args: (string | number)[]
  ): ["status", "OK"] {
    enqueue(command, ...args);
    return ["status", "OK"];
  }
  const _execOk: CommandFunc<OkStatus> = (command, ...args) => {
    const [_, ok] = execRawReply(command, ...args);
    return ok;
  };
  const execStatusReply = _execOk;
  const execIntegerReply = _execOk;
  const execBulkReply = _execOk;
  const execArrayReply = _execOk;
  const d = dummyReadWriteCloser();
  const executor: CommandExecutor<
    StatusReply,
    OkStatus,
    OkStatus,
    OkStatus,
    OkStatus
  > = {
    execRawReply,
    execIntegerReply,
    execStatusReply,
    execBulkReply,
    execArrayReply
  };
  const fakeRedis = create(d, d, d, executor);
  return Object.assign(fakeRedis, executor, { enqueue, flush });
}

function dummyReadWriteCloser(): Deno.ReadWriteCloser {
  return {
    close() {},
    async read(p) {
      return 0;
    },
    async write(p) {
      return 0;
    }
  };
}
