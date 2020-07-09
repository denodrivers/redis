import { connect, Redis, RedisConnectOptions } from "../redis.ts";
import { delay } from "../vendor/https/deno.land/std/async/mod.ts";
import { assert } from "../vendor/https/deno.land/std/testing/asserts.ts";

type TestFunc = () => void | Promise<void>;
type TestServer = {
  path: string;
  process: Deno.Process;
};

export class TestSuite {
  private tests: { name: string; func: TestFunc }[] = [];
  private beforeEachs: TestFunc[] = [];
  private afterAlls: TestFunc[] = [];

  constructor(private prefix: string) {}

  beforeEach(func: TestFunc): void {
    this.beforeEachs.push(func);
  }

  afterAll(func: TestFunc): void {
    this.afterAlls.push(func);
  }

  test(name: string, func: TestFunc): void {
    this.tests.push({ name, func });
  }

  runTests = async (): Promise<void> => {
    try {
      for (const test of this.tests) {
        let res: void | Error;
        try {
          res = await this.beforeEachs
            .reduce((p, f) => p.then(f), Promise.resolve())
            .then(test.func);
        } catch (err) {
          res = err;
        }
        Deno.test(`[${this.prefix}] ${test.name}`, () => {
          if (res instanceof Error) {
            throw res;
          }
        });
      }
    } finally {
      this.afterAlls.forEach(async (f) => await f());
    }
  };
}

const encoder = new TextEncoder();

export async function startRedis({
  port = 6379,
  clusterEnabled = false,
}): Promise<TestServer> {
  const path = `testdata/${port}`;

  if (!(await exists(path))) {
    Deno.mkdirSync(path);
    Deno.copyFileSync(`testdata/redis.conf`, `${path}/redis.conf`);

    let config = `dir ${path}\nport ${port}\n`;
    config += clusterEnabled ? "cluster-enabled yes" : "";

    Deno.writeFileSync(`${path}/redis.conf`, encoder.encode(config), {
      append: true,
    });
  }

  const process = Deno.run({
    cmd: ["redis-server", `testdata/${port}/redis.conf`],
    stdin: "null",
    stdout: "null",
  });

  // Ample time for server to finish startup
  await delay(500);
  return { path, process };
}

export function stopRedis(server: TestServer): void {
  Deno.removeSync(server.path, { recursive: true });
  server.process.close();
}

export function newClient(opt: RedisConnectOptions): Promise<Redis> {
  return connect(opt);
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
}

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
