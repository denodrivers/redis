import type { Connection } from "./connection.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";
import type { RedisReply, RedisValue } from "./protocol/mod.ts";

export interface CommandExecutor {
  readonly connection: Connection;
  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply>;

  /**
   * Closes a redis connection.
   */
  close(): void;
}

export class MuxExecutor implements CommandExecutor {
  constructor(readonly connection: Connection) {}

  private queue: {
    command: string;
    args: RedisValue[];
    d: Deferred<RedisReply>;
  }[] = [];

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    const d = deferred<RedisReply>();
    this.queue.push({ command, args, d });
    if (this.queue.length === 1) {
      this.dequeue();
    }
    return d;
  }

  close(): void {
    this.connection.close();
  }

  private dequeue(): void {
    const [e] = this.queue;
    if (!e) return;
    this.connection.sendCommand(e.command, ...e.args)
      .then(e.d.resolve)
      .catch(e.d.reject)
      .finally(() => {
        this.queue.shift();
        this.dequeue();
      });
  }
}
