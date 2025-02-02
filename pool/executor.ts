import type { Connection, SendCommandOptions } from "../connection.ts";
import type { Pool } from "./pool.ts";
import type { CommandExecutor } from "../executor.ts";
import { DefaultExecutor } from "../executor.ts";
import type { RedisReply, RedisValue } from "../protocol/shared/types.ts";

export function createPooledExecutor(pool: Pool<Connection>): CommandExecutor {
  return new PooledExecutor(pool);
}

class PooledExecutor implements CommandExecutor {
  readonly #pool: Pool<Connection>;
  constructor(pool: Pool<Connection>) {
    this.#pool = pool;
  }

  get connection(): Connection {
    throw new Error("PooledExecutor.connection is not supported");
  }

  async exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    const connection = await this.#pool.acquire();
    try {
      const executor = new DefaultExecutor(connection);
      return await executor.exec(command, ...args);
    } finally {
      this.#pool.release(connection);
    }
  }

  async sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
  ): Promise<RedisReply> {
    const connection = await this.#pool.acquire();
    try {
      const executor = new DefaultExecutor(connection);
      return await executor.sendCommand(command, args, options);
    } finally {
      this.#pool.release(connection);
    }
  }

  close(): void {
    return this.#pool.close();
  }
}
