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
  makeClusterConfigFile = false,
}): Promise<TestServer> {
  const path = tempPath(String(port));

  if (!(await exists(path))) {
    const destPath = `${path}/redis.conf`;
    Deno.mkdirSync(path);
    Deno.copyFileSync(`tests/server/redis.conf`, destPath);

    let config = `dir ${path}\nport ${port}\n`;
    if (clusterEnabled) {
      config += "cluster-enabled yes\n";
      if (makeClusterConfigFile) {
        const clusterConfigFile = `${path}/cluster.conf`;
        config += `cluster-config-file ${clusterConfigFile}`;
      }
    }

    await Deno.writeFile(destPath, encoder.encode(config), {
      append: true,
    });
  }

  const process = Deno.run({
    cmd: ["redis-server", `${path}/redis.conf`],
    stdin: "null",
    stdout: "null",
  });

  await waitForPort(port);
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

async function waitForPort(port: number): Promise<void> {
  let retries = 0;
  const maxRetries = 5;
  while (true) {
    try {
      const conn = await Deno.connect({ port });
      conn.close();
      break;
    } catch (e) {
      retries++;
      if (retries === maxRetries) {
        throw e;
      }
      await delay(200);
    }
  }
}

function tempPath(fileName: string): string {
  const url = new URL(`./tmp/${fileName}`, import.meta.url);
  return url.pathname;
}
