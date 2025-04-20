import type { Connection, SendCommandOptions } from "./connection.ts";
import { isRetriableError } from "./errors.ts";
import type {
  Binary,
  RedisReply,
  RedisValue,
} from "./protocol/shared/types.ts";
import { decoder } from "./internal/encoding.ts";
import {
  kUnstableReadReply,
  kUnstableWriteCommand,
} from "./internal/symbols.ts";

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

export class DefaultClient implements Client {
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

  async subscribe<
    TMessage extends PubSubMessageType = DefaultPubSubMessageType,
  >(
    command: SubscribeCommand,
    ...channelsOrPatterns: Array<string>
  ): Promise<RedisSubscription<TMessage>> {
    const subscription = new DefaultRedisSubscription<TMessage>(this);
    switch (command) {
      case "SUBSCRIBE":
        await subscription.subscribe(...channelsOrPatterns);
        break;
      case "PSUBSCRIBE":
        await subscription.psubscribe(...channelsOrPatterns);
        break;
    }
    return subscription;
  }

  close(): void {
    this.connection.close();
  }
}

class DefaultRedisSubscription<
  TMessage extends PubSubMessageType = DefaultPubSubMessageType,
> implements RedisSubscription<TMessage> {
  get isConnected(): boolean {
    return this.client.connection.isConnected;
  }

  get isClosed(): boolean {
    return this.client.connection.isClosed;
  }

  private channels = Object.create(null);
  private patterns = Object.create(null);

  constructor(private client: Client) {}

  async psubscribe(...patterns: string[]) {
    await this.#writeCommand("PSUBSCRIBE", patterns);
    for (const pat of patterns) {
      this.patterns[pat] = true;
    }
  }

  async punsubscribe(...patterns: string[]) {
    await this.#writeCommand("PUNSUBSCRIBE", patterns);
    for (const pat of patterns) {
      delete this.patterns[pat];
    }
  }

  async subscribe(...channels: string[]) {
    await this.#writeCommand("SUBSCRIBE", channels);
    for (const chan of channels) {
      this.channels[chan] = true;
    }
  }

  async unsubscribe(...channels: string[]) {
    await this.#writeCommand("UNSUBSCRIBE", channels);
    for (const chan of channels) {
      delete this.channels[chan];
    }
  }

  receive(): AsyncIterableIterator<RedisPubSubMessage<TMessage>> {
    return this.#receive(false);
  }

  receiveBuffers(): AsyncIterableIterator<RedisPubSubMessage<Binary>> {
    return this.#receive(true);
  }

  async *#receive<
    T = TMessage,
  >(
    binaryMode: boolean,
  ): AsyncIterableIterator<
    RedisPubSubMessage<T>
  > {
    let forceReconnect = false;
    const connection = this.client.connection;
    while (this.isConnected) {
      try {
        let rep: [string | Binary, string | Binary, T] | [
          string | Binary,
          string | Binary,
          string | Binary,
          T,
        ];
        try {
          rep = await connection[kUnstableReadReply](binaryMode) as typeof rep;
        } catch (err) {
          if (this.isClosed) {
            // Connection already closed by the user.
            break;
          }
          throw err; // Connection may have been unintentionally closed.
        }

        const event = rep[0] instanceof Uint8Array
          ? decoder.decode(rep[0])
          : rep[0];

        if (event === "message" && rep.length === 3) {
          const channel = rep[1] instanceof Uint8Array
            ? decoder.decode(rep[1])
            : rep[1];
          const message = rep[2];
          yield {
            channel,
            message,
          };
        } else if (event === "pmessage" && rep.length === 4) {
          const pattern = rep[1] instanceof Uint8Array
            ? decoder.decode(rep[1])
            : rep[1];
          const channel = rep[2] instanceof Uint8Array
            ? decoder.decode(rep[2])
            : rep[2];
          const message = rep[3];
          yield {
            pattern,
            channel,
            message,
          };
        }
      } catch (error) {
        if (isRetriableError(error)) {
          forceReconnect = true;
        } else throw error;
      } finally {
        if ((!this.isClosed && !this.isConnected) || forceReconnect) {
          forceReconnect = false;
          await connection.reconnect();

          if (Object.keys(this.channels).length > 0) {
            await this.subscribe(...Object.keys(this.channels));
          }
          if (Object.keys(this.patterns).length > 0) {
            await this.psubscribe(...Object.keys(this.patterns));
          }
        }
      }
    }
  }

  close() {
    this.client.connection.close();
  }

  async #writeCommand(command: string, args: Array<string>): Promise<void> {
    await this.client.connection[kUnstableWriteCommand]({ command, args });
  }
}
