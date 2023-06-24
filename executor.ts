import type { Connection, SendCommandOptions } from "./connection.ts";
import type { RedisReply, RedisValue } from "./protocol/mod.ts";

export interface CommandExecutor {
  readonly connection: Connection;
  /**
   * @deprecated
   */
  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply>;

  sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
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

  sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
  ) {
    return this.connection.sendCommand(command, args, options);
  }

  close(): void {
    this.connection.close();
  }
}
