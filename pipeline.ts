import type { Connection } from "./connection.ts";
import { CommandExecutor } from "./executor.ts";
import {
  createStatusReply,
  RedisReply,
  RedisReplyOrError,
  sendCommands,
} from "./protocol/mod.ts";
import { Redis, RedisImpl } from "./redis.ts";
import { Deferred, deferred } from "./vendor/https/deno.land/std/async/mod.ts";

export interface RedisPipeline extends Redis {
  flush(): Promise<RedisReplyOrError[]>;
}

export function createRedisPipeline(
  connection: Connection,
  tx = false,
): RedisPipeline {
  const executor = new PipelineExecutor(connection, tx);
  function flush(): Promise<RedisReplyOrError[]> {
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
    d: Deferred<RedisReplyOrError[]>;
  }[] = [];

  constructor(connection: Connection, private tx: boolean) {
    super(connection);
  }

  exec(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisReply> {
    this.commands.push({ command, args });
    return Promise.resolve(createStatusReply("OK"));
  }

  flush(): Promise<RedisReplyOrError[]> {
    if (this.tx) {
      this.commands.unshift({ command: "MULTI", args: [] });
      this.commands.push({ command: "EXEC", args: [] });
    }
    const d = deferred<RedisReplyOrError[]>();
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
      .then((replies) => e.d.resolve(replies)) // TODO: Make this more efficient.
      .catch(e.d.reject)
      .finally(() => {
        this.queue.shift();
        this.dequeue();
      });
  }
}
