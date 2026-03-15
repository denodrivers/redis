import { decoder } from "./internal/encoding.ts";
import {
  kUnstableStartReadLoop,
  kUnstableWriteCommand,
} from "./internal/symbols.ts";
import type {
  DefaultPubSubMessageType,
  PubSubMessageType,
  RedisPubSubMessage,
  RedisSubscription,
} from "./subscription.ts";
import type { Connection } from "./connection.ts";
import type { Binary } from "./protocol/shared/types.ts";

export class DefaultRedisSubscription<
  TMessage extends PubSubMessageType = DefaultPubSubMessageType,
> implements RedisSubscription<TMessage> {
  get isConnected(): boolean {
    return this.connection.isConnected;
  }

  get isClosed(): boolean {
    return this.connection.isClosed;
  }

  private channels = Object.create(null);
  private patterns = Object.create(null);

  constructor(private readonly connection: Connection) {}

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
    const onConnectionRecovered = async () => {
      if (Object.keys(this.channels).length > 0) {
        await this.subscribe(...Object.keys(this.channels));
      }
      if (Object.keys(this.patterns).length > 0) {
        await this.psubscribe(...Object.keys(this.patterns));
      }
    };
    this.connection.addEventListener("connect", onConnectionRecovered);
    const iter = this.connection[kUnstableStartReadLoop](binaryMode);
    try {
      for await (const _rep of iter) {
        const rep = _rep as ([string | Binary, string | Binary, T] | [
          string | Binary,
          string | Binary,
          string | Binary,
          T,
        ]);
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
      }
    } finally {
      this.connection.removeEventListener(
        "connect",
        onConnectionRecovered,
      );
    }
  }

  close() {
    this.connection.close();
  }

  async #writeCommand(command: string, args: Array<string>): Promise<void> {
    await this.connection[kUnstableWriteCommand]({ command, args });
  }
}
