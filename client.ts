import type { Connection, SendCommandOptions } from "./connection.ts";
import type {
  Binary,
  RedisReply,
  RedisValue,
} from "./protocol/shared/types.ts";

export type DefaultPubSubMessageType = string;
export type PubSubMessageType = string | string[];
export type SubscribeCommand = "SUBSCRIBE" | "PSUBSCRIBE";

export interface RedisSubscription<
  TMessage extends PubSubMessageType = DefaultPubSubMessageType,
> {
  readonly isClosed: boolean;
  receive(): AsyncIterableIterator<RedisPubSubMessage<TMessage>>;
  receiveBuffers(): AsyncIterableIterator<RedisPubSubMessage<Binary>>;
  psubscribe(...patterns: string[]): Promise<void>;
  subscribe(...channels: string[]): Promise<void>;
  punsubscribe(...patterns: string[]): Promise<void>;
  unsubscribe(...channels: string[]): Promise<void>;
  close(): void;
}

export interface RedisPubSubMessage<TMessage = DefaultPubSubMessageType> {
  pattern?: string;
  channel: string;
  message: TMessage;
}

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
