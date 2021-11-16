import { connect, Redis, RedisConnectOptions } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/delay.ts";

type TestFunc = () => void | Promise<void>;
export interface TestServer {
  path: string;
  port: number;
  process: Deno.Process;
}

const encoder = new TextEncoder();

export async function startRedis({
  port = 6379,
  clusterEnabled = false,
  additionalConfigurations = [] as string[],
}): Promise<TestServer> {
  const path = `tests/tmp/${port}`;

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
    stdout: "null",
  });

  // Ample time for server to finish startup
  await delay(1000);
  return { path, port, process };
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
