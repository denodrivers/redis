import type { Client } from "./client.ts";
import {
  createSimpleStringReply,
  RedisCommand,
  RedisReply,
  RedisReplyOrError,
  RedisValue,
} from "./protocol/mod.ts";
import { create, Redis } from "./redis.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";

export interface RedisPipeline extends Redis {
  flush(): Promise<RedisReplyOrError[]>;
}

export function createRedisPipeline(
  client: Client,
  tx = false,
): RedisPipeline {
  const pipelineClient = new PipelineClient(client, tx);
  function flush(): Promise<RedisReplyOrError[]> {
    return pipelineClient.flush();
  }
  return Object.assign(create(pipelineClient), { flush });
}

export class PipelineClient implements Client {
  #commands: RedisCommand[] = [];
  #queue: {
    commands: RedisCommand[];
    d: Deferred<RedisReplyOrError[]>;
  }[] = [];

  #client: Client;
  #tx: boolean;

  get isClosed() {
    return this.#client.isClosed;
  }

  get isConnected() {
    return this.#client.isConnected;
  }

  get isRetriable() {
    return this.#client.isRetriable;
  }

  constructor(
    client: Client,
    tx: boolean,
  ) {
    this.#client = client;
    this.#tx = tx;
  }

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    this.#commands.push({ name: command, args });
    return Promise.resolve(createSimpleStringReply("OK"));
  }

  batch(commands: RedisCommand[]) {
    return this.#client.batch(commands);
  }

  readNextReply() {
    return this.#client.readNextReply();
  }

  connect() {
    return this.#client.connect();
  }

  close() {
    return this.#client.close();
  }

  reconnect() {
    return this.#client.reconnect();
  }

  _forceRetry() {
    return this.#client._forceRetry();
  }

  flush(): Promise<RedisReplyOrError[]> {
    if (this.#tx) {
      this.#commands.unshift({ name: "MULTI", args: [] });
      this.#commands.push({ name: "EXEC", args: [] });
    }
    const d = deferred<RedisReplyOrError[]>();
    this.#queue.push({ commands: [...this.#commands], d });
    if (this.#queue.length === 1) {
      this.dequeue();
    }
    this.#commands = [];
    return d;
  }

  private dequeue(): void {
    const [e] = this.#queue;
    if (!e) return;
    this.#client.batch(e.commands)
      .then(e.d.resolve)
      .catch(e.d.reject)
      .finally(() => {
        this.#queue.shift();
        this.dequeue();
      });
  }
}
