import {
  BufReader,
  BufWriter,
} from "./vendor/https/deno.land/std/io/bufio.ts";
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
  private _isClosed = false;
  get isClosed(): boolean {
    return this._isClosed;
  }

  private channels = Object.create(null);
  private patterns = Object.create(null);

  constructor(private writer: BufWriter, private reader: BufReader) {}

  async psubscribe(...patterns: string[]) {
    await sendCommand(this.writer, this.reader, "PSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      this.channels[pat] = true;
    }
  }

  async punsubscribe(...patterns: string[]) {
    await sendCommand(this.writer, this.reader, "PUNSUBSCRIBE", ...patterns);
    for (const pat of patterns) {
      delete this.patterns[pat];
    }
  }

  async subscribe(...channels: string[]) {
    await sendCommand(this.writer, this.reader, "SUBSCRIBE", ...channels);
    for (const chan of channels) {
      this.channels[chan] = true;
    }
  }

  async unsubscribe(...channels: string[]) {
    await sendCommand(this.writer, this.reader, "UNSUBSCRIBE", ...channels);
    for (const chan of channels) {
      delete this.channels[chan];
    }
  }

  async *receive(): AsyncIterableIterator<RedisPubSubMessage> {
    while (!this._isClosed) {
      const rep = (await readArrayReply(this.reader)) as string[];
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
    }
  }

  async close() {
    try {
      await this.unsubscribe(...Object.keys(this.channels));
      await this.punsubscribe(...Object.keys(this.patterns));
    } finally {
      this._isClosed = true;
    }
  }
}

export async function subscribe(
  writer: BufWriter,
  reader: BufReader,
  ...channels: string[]
): Promise<RedisSubscription> {
  const sub = new RedisSubscriptionImpl(writer, reader);
  await sub.subscribe(...channels);
  return sub;
}

export async function psubscribe(
  writer: BufWriter,
  reader: BufReader,
  ...patterns: string[]
): Promise<RedisSubscription> {
  const sub = new RedisSubscriptionImpl(writer, reader);
  await sub.psubscribe(...patterns);
  return sub;
}
