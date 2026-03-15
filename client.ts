import type { Connection, SendCommandOptions } from "./connection.ts";
import type { RedisReply, RedisValue } from "./protocol/shared/types.ts";
import type {
  DefaultPubSubMessageType,
  PubSubMessageType,
  RedisSubscription,
  SubscribeCommand,
} from "./subscription.ts";

/**
 * A low-level client for Redis.
 */
export interface Client {
  /**
   * @deprecated
   */
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

  subscribe<TMessage extends PubSubMessageType = DefaultPubSubMessageType>(
    command: SubscribeCommand,
    ...channelsOrPatterns: Array<string>
  ): Promise<RedisSubscription<TMessage>>;

  /**
   * Closes a redis connection.
   */
  close(): void;
}
