import { connect, Redis, RedisConnectOptions } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/delay.ts";

type TestFunc = () => void | Promise<void>;
export interface TestServer {
  path: string;
  process: Deno.Process;
}

export class TestSuite {
  private tests: { name: string; func: TestFunc }[] = [];
  private beforeEachs: TestFunc[] = [];
  private afterEachs: TestFunc[] = [];
  private afterAlls: TestFunc[] = [];

  constructor(private prefix: string) {}

  beforeEach(func: TestFunc): void {
    this.beforeEachs.push(func);
  }

  afterEach(func: TestFunc): void {
    this.afterEachs.push(func);
  }

  afterAll(func: TestFunc): void {
    this.afterAlls.push(func);
  }

  test(name: string, func: TestFunc): void {
    this.tests.push({ name, func });
  }

  runTests(): void {
    for (const test of this.tests) {
      Deno.test(`[${this.prefix}] ${test.name}`, async () => {
        for (const f of this.beforeEachs) {
          await f();
        }
        try {
          await test.func();
        } finally {
          for (const f of this.afterEachs) {
            await f();
          }
        }
      });
    }
    Deno.test({
      name: `[${this.prefix}] afterAll`,
      fn: async () => {
        for (const f of this.afterAlls) {
          await f();
        }
      },
      sanitizeOps: false,
      sanitizeResources: false,
    });
  }
}

const encoder = new TextEncoder();

export async function startRedis({
  port = 6379,
  clusterEnabled = false,
  additionalConfigurations = [] as string[],
  debug = false,
}): Promise<TestServer> {
  const path = `tests/server/${port}`;

  if (!(await exists(path))) {
    Deno.mkdirSync(path);
    Deno.copyFileSync(`tests/server/redis.conf`, `${path}/redis.conf`);

    let config = `dir ${path}\nport ${port}\n`;
    config += clusterEnabled ? "cluster-enabled yes" : "";
    if (additionalConfigurations.length > 0) {
      config += "\n" + additionalConfigurations.join("\n");
    }

    await Deno.writeFile(`${path}/redis.conf`, encoder.encode(config), {
      append: true,
    });
  }

  const process = Deno.run({
    cmd: ["redis-server", `${path}/redis.conf`],
    stdin: "null",
    stdout: debug ? "inherit" : "null",
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

let currentPort = 7000;
export function nextPort(): number {
  return currentPort++;
}
