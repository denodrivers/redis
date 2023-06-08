import type { Connection } from "./connection.ts";
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

export class DefaultExecutor implements CommandExecutor {
  constructor(readonly connection: Connection) {}

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    return this.connection.sendCommand(command, args);
  }

  close(): void {
    this.connection.close();
  }
}
