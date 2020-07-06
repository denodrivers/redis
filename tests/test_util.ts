import { Redis, connect, RedisConnectOptions } from "../redis.ts";
import { assert } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import { RedisConnection } from "../connection.ts";

function* dbIndex() {
  let i = 0;
  while (true) {
    yield i;
    i++;
    if (i > 15) i = 0;
  }
}
const it = dbIndex();
function db(): number {
  const { value } = it.next();
  assert(value != undefined);
  return value;
}

export async function makeTest(
  prefix: string,
): Promise<{
  client: Redis;
  opts: RedisConnectOptions;
  test: (name: string, func: () => void | Promise<void>) => void;
}> {
  const opts = { hostname: "127.0.0.1", port: 6379, db: db() };
  const client = await connect(opts);
  async function beforeEach() {
    await client.flushdb(false);
  }
  const test = (desc: string, func: () => void | Promise<void>) => {
    Deno.test(`[${prefix}] ${desc}`, async () => {
      await beforeEach();
      await func();
    });
  };
  return { test, client, opts };
}

interface RedisServer {
  dispose(): Promise<void>;
}

const USE_DOCKER = Deno.env.get("USE_DOCKER");
const useDocker = USE_DOCKER === "1" || USE_DOCKER === "true";
export async function startRedisServer(port: number): Promise<RedisServer> {
  if (useDocker) {
    const containerName = `redis-${port}`;
    const process = Deno.run({
      cmd: [
        "docker",
        "run",
        "--name",
        containerName,
        "--port",
        `${port}:${port}`,
        "-d",
        "redis",
        "redis-server",
        "--port",
        String(port),
      ],
    });
    await process.status();
    process.close();
    await delay(500);
    return {
      async dispose() {
        const process = Deno.run({
          cmd: ["docker", "stop", containerName],
        });
        await process.status();
        process.close();
      },
    };
  } else {
    const process = Deno.run(
      {
        cmd: ["redis-server", "--port", port.toString()],
        stdin: "null",
        stdout: "null",
      },
    );
    await delay(500);
    return {
      async dispose() {
        process.close();
      },
    };
  }
}
