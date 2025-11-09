import type { Connection, SendCommandOptions } from "../connection.ts";
import type { Pool } from "./pool.ts";
import type {
  Client,
  DefaultPubSubMessageType,
  PubSubMessageType,
  RedisSubscription,
  SubscribeCommand,
} from "../client.ts";
import { createDefaultClient } from "../default_client.ts";
import {
  kUnstablePipeline,
  kUnstableReadReply,
  kUnstableWriteCommand,
} from "../internal/symbols.ts";
import { delegate } from "../internal/delegate.ts";
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
      const client = createDefaultClient(connection);
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
      const client = createDefaultClient(connection);
      return await client.sendCommand(command, args, options);
    } finally {
      this.#pool.release(connection);
    }
  }

  async subscribe<
    TMessage extends PubSubMessageType = DefaultPubSubMessageType,
  >(
    command: SubscribeCommand,
    ...channelsOrPatterns: Array<string>
  ): Promise<RedisSubscription<TMessage>> {
    const connection = await this.#pool.acquire();
    const client = createDefaultClient(
      createPoolConnection(this.#pool, connection),
    );
    try {
      const subscription = await client.subscribe<TMessage>(
        command,
        ...channelsOrPatterns,
      );
      return subscription;
    } catch (error) {
      this.#pool.release(connection);
      throw error;
    }
  }

  close(): void {
    return this.#pool.close();
  }
}

function createPoolConnection(
  pool: Pool<Connection>,
  connection: Connection,
): Connection {
  function close(): void {
    return pool.release(connection);
  }
  return {
    ...delegate(connection, [
      "connect",
      "reconnect",
      "sendCommand",
      "addEventListener",
      "removeEventListener",
      Symbol.dispose,
      kUnstableReadReply,
      kUnstableWriteCommand,
      kUnstablePipeline,
    ]),
    close,
    get name() {
      return connection.name;
    },
    get isConnected() {
      return connection.isConnected;
    },
    get isClosed() {
      return connection.isClosed;
    },
  };
}
