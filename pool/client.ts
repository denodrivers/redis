import type { Connection, SendCommandOptions } from "../connection.ts";
import type { Pool } from "./pool.ts";
import type { Client } from "../client.ts";
import { DefaultClient } from "../client.ts";
import type { RedisReply, RedisValue } from "../protocol/shared/types.ts";

export function createPoolClient(pool: Pool<Connection>): Client {
  return new PoolClient(pool);
}

class PoolClient implements Client {
  readonly #pool: Pool<Connection>;
  constructor(pool: Pool<Connection>) {
    this.#pool = pool;
  }

  get connection(): Connection {
    throw new Error("PoolClient.connection is not supported");
  }

  async exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    const connection = await this.#pool.acquire();
    try {
      const client = new DefaultClient(connection);
      return await client.exec(command, ...args);
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
      const client = new DefaultClient(connection);
      return await client.sendCommand(command, args, options);
    } finally {
      this.#pool.release(connection);
    }
  }

  close(): void {
    return this.#pool.close();
  }
}
