import type { Connection } from "./connection.ts";
import { EOFError } from "./errors.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";
import { sendCommand } from "./protocol/mod.ts";
import type { RedisReply, RedisValue } from "./protocol/mod.ts";

export interface CommandExecutor {
  readonly connection: Connection;

  /**
   * @deprecated use `sendCommand` instead
   */
  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply>;

  sendCommand(
    args: [command: string, ...args: Array<RedisValue>],
  ): Promise<RedisReply>;

  /**
   * Closes a redis connection.
   */
  close(): void;
}

export class MuxExecutor implements CommandExecutor {
  constructor(readonly connection: Connection) {}

  private queue: {
    args: [command: string, ...args: Array<RedisValue>];
    d: Deferred<RedisReply>;
  }[] = [];

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    return this.sendCommand([command, ...args]);
  }

  sendCommand(
    args: [command: string, ...args: Array<RedisValue>],
  ): Promise<RedisReply> {
    const d = deferred<RedisReply>();
    this.queue.push({ args, d });
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
    sendCommand(
      this.connection.writer,
      this.connection.reader,
      e.args,
    )
      .then(e.d.resolve)
      .catch(async (error) => {
        if (
          this.connection.maxRetryCount > 0 &&
          // Error `BadResource` is thrown when an attempt is made to write to a closed connection,
          //  Make sure that the connection wasn't explicitly closed by the user before trying to reconnect.
          ((error instanceof Deno.errors.BadResource &&
            !this.connection.isClosed) ||
            error instanceof Deno.errors.BrokenPipe ||
            error instanceof Deno.errors.ConnectionAborted ||
            error instanceof Deno.errors.ConnectionRefused ||
            error instanceof Deno.errors.ConnectionReset ||
            error instanceof EOFError)
        ) {
          await this.connection.reconnect();
        } else e.d.reject(error);
      })
      .finally(() => {
        this.queue.shift();
        this.dequeue();
      });
  }
}
