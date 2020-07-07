import { connect, Redis, RedisConnectOptions } from "../redis.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import { assert } from "../vendor/https/deno.land/std/testing/asserts.ts";

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
  assert(value !== undefined);
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

interface StartRedisServerOptions {
  port: number;
}

export async function startRedisServer(
  options: StartRedisServerOptions,
): Promise<Deno.Process> {
  const { port } = options;
  const process = Deno.run({
    cmd: ["redis-server", "--port", port.toString()],
    stdin: "null",
    stdout: "null",
  });
  await waitForPort(port);
  return process;
}

// FIXME!
function waitForPort(_port: number): Promise<void> {
  return delay(500);
}

export async function startRedisCluster(
  ...ports: number[]
): Promise<() => void> {
  const processes: Deno.Process[] = [];
  const folders: string[] = [];
  const encoder = new TextEncoder();
  for (let port of ports) {
    const baseFolder = `testdata/${port}`;
    if (!(await exists(baseFolder))) {
      Deno.mkdirSync(baseFolder);
      folders.push(baseFolder);
      Deno.copyFileSync(`testdata/redis.conf`, `${baseFolder}/redis.conf`);
      Deno.writeFileSync(
        `testdata/${port}/redis.conf`,
        encoder.encode(`cluster-enabled yes\ndir ${baseFolder}\nport ${port}`),
        { append: true },
      );
    }
    const process = Deno.run({
      cmd: ["redis-server", `testdata/${port}/redis.conf`],
      stdin: "null",
      stdout: "null",
    });
    await delay(500);
    processes.push(process);
  }
  return () => {
    processes.forEach((p) => p.close());
    folders.forEach((f) => Deno.removeSync(f, { recursive: true }));
  };
}

async function exists(filename: string): Promise<boolean> {
  try {
    await Deno.stat(filename);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw err;
    }
  }
}
