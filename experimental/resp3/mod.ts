import { connect as _connect } from "../../redis.ts";
import type { Redis as BaseRedis, RedisConnectOptions } from "../../redis.ts";
import type {
  ConditionalMap,
  MapReply,
  RedisValue,
} from "../../protocol/mod.ts";

export interface Redis extends BaseRedis {
  hgetallMap(key: string): Promise<ConditionalMap>;
}

export async function connect(opts: RedisConnectOptions): Promise<Redis> {
  const redis = await _connect(opts);
  await redis.hello(3);
  return createRESP3Client(redis);
}

// FIXME:
function createRESP3Client(redis: BaseRedis): Redis {
  async function execMapReply(
    command: string,
    args: RedisValue[] = [],
  ): Promise<ConditionalMap> {
    const reply = await redis.executor.exec(command, ...args) as MapReply;
    return reply.map();
  }

  return Object.assign(redis, {
    hgetallMap: (key: string) => execMapReply("HGETALL", [key]),
  });
}
