import type { Redis, RedisConnectOptions } from "../redis.ts";
import { create } from "../redis.ts";
import type { Connection } from "../connection.ts";
import { createRedisConnection } from "../connection.ts";
import { createDefaultPool } from "./default_pool.ts";
import { createPooledExecutor } from "./executor.ts";

export interface CreatePoolClientOptions {
  connection: RedisConnectOptions;
  maxConnections?: number;
}

export function createPoolClient(
  options: CreatePoolClientOptions,
): Promise<Redis> {
  const pool = createDefaultPool<Connection>({
    acquire,
    maxConnections: options.maxConnections ?? 8,
  });
  const executor = createPooledExecutor(pool);
  const client = create(executor);
  return Promise.resolve(client);

  async function acquire(): Promise<Connection> {
    const { hostname, port, ...connectionOptions } = options.connection;
    const connection = createRedisConnection(hostname, port, connectionOptions);
    await connection.connect();
    return connection;
  }
}
