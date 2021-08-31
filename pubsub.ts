import type { Client } from "./client.ts";
import { InvalidStateError } from "./errors.ts";

type DefaultMessageType = string;
type ValidMessageType = string | string[];

export interface RedisSubscription<
  TMessage extends ValidMessageType = DefaultMessageType,
> {
  readonly isClosed: boolean;
  receive(): AsyncIterableIterator<RedisPubSubMessage<TMessage>>;
  psubscribe(...patterns: string[]): Promise<void>;
  subscribe(...channels: string[]): Promise<void>;
  punsubscribe(...patterns: string[]): Promise<void>;
  unsubscribe(...channels: string[]): Promise<void>;
  close(): Promise<void>;
}

export interface RedisPubSubMessage<TMessage = DefaultMessageType> {
  pattern?: string;
  channel: string;
  message: TMessage;
}

class RedisSubscriptionImpl<
  TMessage extends ValidMessageType = DefaultMessageType,
> implements RedisSubscription<TMessage> {
  readonly #client: Client;

  get isConnected(): boolean {
    return this.#client.isConnected;
  }

  get isClosed(): boolean {
    return this.#client.isClosed;
  }

  #channels = Object.create(null);
  #patterns = Object.create(null);

  constructor(client: Client) {
    // Force retriable connection for connection shared for pub/sub.
    if (!client.isRetriable) client._forceRetry();
    this.#client = client;
  }

  async psubscribe(...patterns: string[]) {
    await this.#client.exec("PSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      this.#patterns[pat] = true;
    }
  }

  async punsubscribe(...patterns: string[]) {
    await this.#client.exec("PUNSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      delete this.#patterns[pat];
    }
  }

  async subscribe(...channels: string[]) {
    await this.#client.exec("SUBSCRIBE", ...channels);
    for (const chan of channels) {
      this.#channels[chan] = true;
    }
  }

  async unsubscribe(...channels: string[]) {
    await this.#client.exec("UNSUBSCRIBE", ...channels);
    for (const chan of channels) {
      delete this.#channels[chan];
    }
  }

  async *receive(): AsyncIterableIterator<RedisPubSubMessage<TMessage>> {
    let forceReconnect = false;
    while (this.isConnected) {
      try {
        let rep: [string, string, TMessage] | [
          string,
          string,
          string,
          TMessage,
        ];
        try {
          rep = (await this.#client.readNextReply()).value() as [
            string,
            string,
            TMessage,
          ] | [string, string, string, TMessage];
        } catch (err) {
          if (err instanceof Deno.errors.BadResource) {
            // Connection already closed.
            this.#client.close();
            break;
          }
          throw err;
        }
        const ev = rep[0];

        if (ev === "message" && rep.length === 3) {
          yield {
            channel: rep[1],
            message: rep[2],
          };
        } else if (ev === "pmessage" && rep.length === 4) {
          yield {
            pattern: rep[1],
            channel: rep[2],
            message: rep[3],
          };
        }
      } catch (error) {
        if (
          error instanceof InvalidStateError ||
          error instanceof Deno.errors.BadResource
        ) {
          forceReconnect = true;
        } else throw error;
      } finally {
        if ((!this.isClosed && !this.isConnected) || forceReconnect) {
          await this.#client.reconnect();
          forceReconnect = false;

          if (Object.keys(this.#channels).length > 0) {
            await this.subscribe(...Object.keys(this.#channels));
          }
          if (Object.keys(this.#patterns).length > 0) {
            await this.psubscribe(...Object.keys(this.#patterns));
          }
        }
      }
    }
  }

  async close() {
    try {
      await this.unsubscribe(...Object.keys(this.#channels));
      await this.punsubscribe(...Object.keys(this.#patterns));
    } finally {
      this.#client.close();
    }
  }
}

export async function subscribe<
  TMessage extends ValidMessageType = DefaultMessageType,
>(
  client: Client,
  ...channels: string[]
): Promise<RedisSubscription<TMessage>> {
  const sub = new RedisSubscriptionImpl<TMessage>(client);
  await sub.subscribe(...channels);
  return sub;
}

export async function psubscribe<
  TMessage extends ValidMessageType = DefaultMessageType,
>(
  client: Client,
  ...patterns: string[]
): Promise<RedisSubscription<TMessage>> {
  const sub = new RedisSubscriptionImpl<TMessage>(client);
  await sub.psubscribe(...patterns);
  return sub;
}
