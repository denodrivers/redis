import type { Connection } from "./connection.ts";
import { CommandExecutor } from "./executor.ts";
import { RawReplyOrError, RedisRawReply, sendCommands } from "./io.ts";
import { Redis, RedisImpl } from "./redis.ts";
import { Deferred, deferred } from "./vendor/https/deno.land/std/async/mod.ts";

export type RedisPipeline = Redis & {
  flush(): Promise<RawReplyOrError[]>;
};

export function createRedisPipeline(
  connection: Connection,
  tx = false,
): RedisPipeline {
  const executor = new PipelineExecutor(connection, tx);
  function flush(): Promise<RawReplyOrError[]> {
    return executor.flush();
  }
  const client = new RedisImpl(connection, executor);
  return Object.assign(client, { flush });
}

export class PipelineExecutor extends CommandExecutor {
  private commands: {
    command: string;
    args: (number | string)[];
  }[] = [];
  private queue: {
    commands: {
      command: string;
      args: (number | string)[];
    }[];
    d: Deferred<RawReplyOrError[]>;
  }[] = [];

  constructor(connection: Connection, private tx: boolean) {
    super(connection);
  }

  exec(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply> {
    this.commands.push({ command, args });
    return Promise.resolve(["status", "OK"]);
  }

  flush(): Promise<RawReplyOrError[]> {
    if (this.tx) {
      this.commands.unshift({ command: "MULTI", args: [] });
      this.commands.push({ command: "EXEC", args: [] });
    }
    const d = deferred<RawReplyOrError[]>();
    this.queue.push({ commands: [...this.commands], d });
    if (this.queue.length === 1) {
      this.dequeue();
    }
    this.commands = [];
    return d;
  }

  private dequeue(): void {
    const [e] = this.queue;
    if (!e) return;
    sendCommands(this.connection.writer, this.connection.reader, e.commands)
      .then(e.d.resolve)
      .catch(e.d.reject)
      .finally(() => {
        this.queue.shift();
        this.dequeue();
      });
  }
}
