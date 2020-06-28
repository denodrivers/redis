import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import { RedisConnection } from "./connection.ts";
import { readArrayReply, sendCommand } from "./io.ts";

export type RedisSubscription = {
  readonly isClosed: boolean;
  receive(): AsyncIterableIterator<RedisPubSubMessage>;
  psubscribe(...patterns: string[]): Promise<void>;
  subscribe(...channels: string[]): Promise<void>;
  punsubscribe(...patterns: string[]): Promise<void>;
  unsubscribe(...channels: string[]): Promise<void>;
  close(): Promise<void>;
};

export type RedisPubSubMessage = {
  pattern?: string;
  channel: string;
  message: string;
};

class RedisSubscriptionImpl implements RedisSubscription {
  get isConnected(): boolean {
    return this.connection.isConnected;
  }

  get isClosed(): boolean {
    return this.connection.isClosed;
  }

  private channels = Object.create(null);
  private patterns = Object.create(null);

  constructor(private connection: RedisConnection) {
    // Force retriable connection for connection shared for pub/sub.
    if (connection.maxRetryCount === 0) connection.maxRetryCount = 10;
  }

  async psubscribe(...patterns: string[]) {
    await sendCommand(
      this.connection.writer!,
      this.connection.reader!,
      "PSUBSCRIBE",
      ...patterns,
    );
    for (const pat of patterns) {
      this.patterns[pat] = true;
    }
  }

  async punsubscribe(...patterns: string[]) {
    await sendCommand(
      this.connection.writer!,
      this.connection.reader!,
      "PUNSUBSCRIBE",
      ...patterns,
    );
    for (const pat of patterns) {
      delete this.patterns[pat];
    }
  }

  async subscribe(...channels: string[]) {
    await sendCommand(
      this.connection.writer!,
      this.connection.reader!,
      "SUBSCRIBE",
      ...channels,
    );
    for (const chan of channels) {
      this.channels[chan] = true;
    }
  }

  async unsubscribe(...channels: string[]) {
    await sendCommand(
      this.connection.writer!,
      this.connection.reader!,
      "UNSUBSCRIBE",
      ...channels,
    );
    for (const chan of channels) {
      delete this.channels[chan];
    }
  }

  async *receive(): AsyncIterableIterator<RedisPubSubMessage> {
    let forceReconnect = false;
    while (this.isConnected) {
      try {
        const rep = (await readArrayReply(this.connection.reader!)) as string[];
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
          error.message === "Invalid state" ||
          error instanceof Deno.errors.BadResource
        ) {
          forceReconnect = true;
        } else throw error;
      } finally {
        if ((!this.isClosed && !this.isConnected) || forceReconnect) {
          await this.connection.reconnect();
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

  async close() {
    try {
      await this.unsubscribe(...Object.keys(this.channels));
      await this.punsubscribe(...Object.keys(this.patterns));
    } finally {
      this.connection.close();
    }
  }
}

export async function subscribe(
  connection: RedisConnection,
  ...channels: string[]
): Promise<RedisSubscription> {
  const sub = new RedisSubscriptionImpl(connection);
  await sub.subscribe(...channels);
  return sub;
}

export async function psubscribe(
  connection: RedisConnection,
  ...patterns: string[]
): Promise<RedisSubscription> {
  const sub = new RedisSubscriptionImpl(connection);
  await sub.psubscribe(...patterns);
  return sub;
}
