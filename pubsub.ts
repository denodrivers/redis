import type { CommandExecutor } from "./executor.ts";
import { InvalidStateError } from "./errors.ts";
import type { Binary } from "./protocol/mod.ts";
import { readArrayReply } from "./protocol/mod.ts";
import { decoder } from "./protocol/_util.ts";

type DefaultMessageType = string;
type ValidMessageType = string | string[];

export interface RedisSubscription<
  TMessage extends ValidMessageType = DefaultMessageType,
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

export interface RedisPubSubMessage<TMessage = DefaultMessageType> {
  pattern?: string;
  channel: string;
  message: TMessage;
}

class RedisSubscriptionImpl<
  TMessage extends ValidMessageType = DefaultMessageType,
> implements RedisSubscription<TMessage> {
  get isConnected(): boolean {
    return this.executor.connection.isConnected;
  }

  get isClosed(): boolean {
    return this.executor.connection.isClosed;
  }

  private channels = Object.create(null);
  private patterns = Object.create(null);

  constructor(private executor: CommandExecutor) {}

  async psubscribe(...patterns: string[]) {
    await this.executor.exec("PSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      this.patterns[pat] = true;
    }
  }

  async punsubscribe(...patterns: string[]) {
    await this.executor.exec("PUNSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      delete this.patterns[pat];
    }
  }

  async subscribe(...channels: string[]) {
    await this.executor.exec("SUBSCRIBE", ...channels);
    for (const chan of channels) {
      this.channels[chan] = true;
    }
  }

  async unsubscribe(...channels: string[]) {
    await this.executor.exec("UNSUBSCRIBE", ...channels);
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
    const connection = this.executor.connection;
    while (this.isConnected) {
      try {
        let rep: [string | Binary, string | Binary, T] | [
          string | Binary,
          string | Binary,
          string | Binary,
          T,
        ];
        try {
          // TODO: `readArrayReply` should not be called directly here
          rep = (await readArrayReply(
            connection.reader,
            binaryMode,
          )) as typeof rep;
        } catch (err) {
          if (err instanceof Deno.errors.BadResource) {
            // Connection already closed.
            connection.close();
            break;
          }
          throw err;
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
        if (
          error instanceof InvalidStateError ||
          error instanceof Deno.errors.BadResource
        ) {
          forceReconnect = true;
        } else throw error;
      } finally {
        if ((!this.isClosed && !this.isConnected) || forceReconnect) {
          await connection.reconnect();
          forceReconnect = false;

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
    this.executor.connection.close();
  }
}

export async function subscribe<
  TMessage extends ValidMessageType = DefaultMessageType,
>(
  executor: CommandExecutor,
  ...channels: string[]
): Promise<RedisSubscription<TMessage>> {
  const sub = new RedisSubscriptionImpl<TMessage>(executor);
  await sub.subscribe(...channels);
  return sub;
}

export async function psubscribe<
  TMessage extends ValidMessageType = DefaultMessageType,
>(
  executor: CommandExecutor,
  ...patterns: string[]
): Promise<RedisSubscription<TMessage>> {
  const sub = new RedisSubscriptionImpl<TMessage>(executor);
  await sub.psubscribe(...patterns);
  return sub;
}
