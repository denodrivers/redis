import { CommandExecutor } from "./executor.ts";
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
  executor: CommandExecutor,
  tx = false,
): RedisPipeline {
  const pipelineExecutor = new PipelineExecutor(executor, tx);
  function flush(): Promise<RedisReplyOrError[]> {
    return pipelineExecutor.flush();
  }
  const client = create(pipelineExecutor);
  return Object.assign(client, { flush });
}

export class PipelineExecutor implements CommandExecutor {
  #commands: RedisCommand[] = [];
  #queue: {
    commands: RedisCommand[];
    d: Deferred<RedisReplyOrError[]>;
  }[] = [];
  #executor: CommandExecutor;

  constructor(
    executor: CommandExecutor,
    private tx: boolean,
  ) {
    this.#executor = executor;
  }

  get connection() {
    return this.#executor.connection;
  }

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    this.#commands.push({ name: command, args });
    return Promise.resolve(createSimpleStringReply("OK"));
  }

  batch(commands: Array<RedisCommand>): Promise<Array<RedisReplyOrError>> {
    return this.#executor.batch(commands);
  }

  flush(): Promise<RedisReplyOrError[]> {
    if (this.tx) {
      this.#commands.unshift({ name: "MULTI", args: [] });
      this.#commands.push({ name: "EXEC", args: [] });
    }
    const d = deferred<RedisReplyOrError[]>();
    this.#queue.push({ commands: [...this.#commands], d });
    if (this.#queue.length === 1) {
      this.#dequeue();
    }
    this.#commands = [];
    return d;
  }

  #dequeue(): void {
    const [e] = this.#queue;
    if (!e) return;
    this.#executor.batch(e.commands)
      .then(e.d.resolve)
      .catch(e.d.reject)
      .finally(() => {
        this.#queue.shift();
        this.#dequeue();
      });
  }
}
