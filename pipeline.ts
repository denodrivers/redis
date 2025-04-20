import type { Connection, SendCommandOptions } from "./connection.ts";
import { kEmptyRedisArgs } from "./connection.ts";
import type {
  Client,
  DefaultPubSubMessageType,
  PubSubMessageType,
  RedisSubscription,
  SubscribeCommand,
} from "./client.ts";
import type {
  RawOrError,
  RedisReply,
  RedisValue,
} from "./protocol/shared/types.ts";
import { okReply } from "./protocol/shared/types.ts";
import type { Redis } from "./redis.ts";
import { create } from "./redis.ts";
import { kUnstablePipeline } from "./internal/symbols.ts";

export interface RedisPipeline extends Redis {
  flush(): Promise<RawOrError[]>;
}

export function createRedisPipeline(
  connection: Connection,
  tx = false,
): RedisPipeline {
  const pipeline = new PipelineClient(connection, tx);
  function flush(): Promise<RawOrError[]> {
    return pipeline.flush();
  }
  const client = create(pipeline);
  return Object.assign(client, { flush });
}

class PipelineClient implements Client {
  private commands: {
    command: string;
    args: RedisValue[];
    returnUint8Arrays?: boolean;
  }[] = [];
  private queue: {
    commands: {
      command: string;
      args: RedisValue[];
      returnUint8Arrays?: boolean;
    }[];
    resolve: (value: RawOrError[]) => void;
    reject: (error: unknown) => void;
  }[] = [];

  constructor(
    readonly connection: Connection,
    private tx: boolean,
  ) {
  }

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    return this.sendCommand(command, args);
  }

  sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
  ): Promise<RedisReply> {
    this.commands.push({
      command,
      args: args ?? kEmptyRedisArgs,
      returnUint8Arrays: options?.returnUint8Arrays,
    });
    return Promise.resolve(okReply);
  }

  close(): void {
    return this.connection.close();
  }

  subscribe<TMessage extends PubSubMessageType = DefaultPubSubMessageType>(
    _command: SubscribeCommand,
    ..._channelsOrPatterns: Array<string>
  ): Promise<RedisSubscription<TMessage>> {
    return Promise.reject(new Error("Pub/Sub cannot be used with a pipeline"));
  }

  flush(): Promise<RawOrError[]> {
    if (this.tx) {
      this.commands.unshift({ command: "MULTI", args: [] });
      this.commands.push({ command: "EXEC", args: [] });
    }
    const { promise, resolve, reject } = Promise.withResolvers<RawOrError[]>();
    this.queue.push({ commands: [...this.commands], resolve, reject });
    if (this.queue.length === 1) {
      this.dequeue();
    }
    this.commands = [];
    return promise;
  }

  private dequeue(): void {
    const [e] = this.queue;
    if (!e) return;
    this.connection[kUnstablePipeline](e.commands)
      .then(e.resolve)
      .catch(e.reject)
      .finally(() => {
        this.queue.shift();
        this.dequeue();
      });
  }
}
