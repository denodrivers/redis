import { Connection } from "./connection.ts";
import { EOFError } from "./error.ts";
import { RedisRawReply, sendCommand } from "./io.ts";
import { Deferred, deferred } from "./vendor/https/deno.land/std/async/mod.ts";

export abstract class CommandExecutor {
  connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  abstract exec(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply>;
}

export class MuxExecutor extends CommandExecutor {
  private queue: {
    command: string;
    args: (string | number)[];
    d: Deferred<RedisRawReply>;
  }[] = [];

  async exec(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply> {
    const d = deferred<RedisRawReply>();
    this.queue.push({ command, args, d });
    if (this.queue.length === 1) {
      this.dequeue();
    }
    return d;
  }

  private dequeue(): void {
    const [e] = this.queue;
    if (!e) return;
    sendCommand(
      this.connection.writer,
      this.connection.reader,
      e.command,
      ...e.args,
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
