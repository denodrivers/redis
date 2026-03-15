import type { Binary } from "./protocol/shared/types.ts";
export type DefaultPubSubMessageType = string;
export type PubSubMessageType = string | string[];
export type SubscribeCommand = "SUBSCRIBE" | "PSUBSCRIBE";

export interface RedisPubSubMessage<TMessage = DefaultPubSubMessageType> {
  pattern?: string;
  channel: string;
  message: TMessage;
}

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
