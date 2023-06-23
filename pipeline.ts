import type { Connection, SendCommandOptions } from "./connection.ts";
import { kEmptyRedisArgs } from "./connection.ts";
import { CommandExecutor } from "./executor.ts";
import {
  okReply,
  RawOrError,
  RedisReply,
  RedisValue,
  sendCommands,
} from "./protocol/mod.ts";
import { create, Redis } from "./redis.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";

export interface RedisPipeline extends Redis {
  flush(): Promise<RawOrError[]>;
}

export function createRedisPipeline(
  connection: Connection,
  tx = false,
): RedisPipeline {
  const executor = new PipelineExecutor(connection, tx);
  function flush(): Promise<RawOrError[]> {
    return executor.flush();
  }
  const client = create(executor);
  return Object.assign(client, { flush });
}

export class PipelineExecutor implements CommandExecutor {
  private commands: {
    command: string;
    args: RedisValue[];
    returnUint8Arrays?: boolean;
  }[] = [];
  private queue: {
    commands: {
      command: string;
      args: RedisValue[];
      returnUint8Arrays?: boolean;
    }[];
    d: Deferred<unknown[]>;
  }[] = [];

  constructor(
    readonly connection: Connection,
    private tx: boolean,
  ) {
  }

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    return this.sendCommand(command, args);
  }

  sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
  ): Promise<RedisReply> {
    this.commands.push({
      command,
      args: args ?? kEmptyRedisArgs,
      returnUint8Arrays: options?.returnUint8Arrays,
    });
    return Promise.resolve(okReply);
  }

  close(): void {
    return this.connection.close();
  }

  flush(): Promise<RawOrError[]> {
    if (this.tx) {
      this.commands.unshift({ command: "MULTI", args: [] });
      this.commands.push({ command: "EXEC", args: [] });
    }
    const d = deferred<RawOrError[]>();
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
