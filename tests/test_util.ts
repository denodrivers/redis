import { connect, Redis, RedisConnectOptions } from "../mod.ts";
import { delay } from "../vendor/https/deno.land/std/async/delay.ts";

export type Connector = typeof connect;
export interface TestServer {
  path: string;
  port: number;
  process: Deno.ChildProcess;
}

const encoder = new TextEncoder();

export async function startRedis({
  port = 6379,
  clusterEnabled = false,
  makeClusterConfigFile = false,
}): Promise<TestServer> {
  const path = tempPath(String(port));
  if (!(await exists(path))) {
    await Deno.mkdir(path);
  }

  // Setup redis.conf
  const destPath = `${path}/redis.conf`;
  let config = await Deno.readTextFile("tests/server/redis.conf");
  config += `dir ${path}\nport ${port}\n`;
  if (clusterEnabled) {
    config += "cluster-enabled yes\n";
    if (makeClusterConfigFile) {
      const clusterConfigFile = `${path}/cluster.conf`;
      config += `cluster-config-file ${clusterConfigFile}`;
    }
  }
  await Deno.writeFile(destPath, encoder.encode(config));

  // Start redis server
  const process = new Deno.Command("redis-server", {
    args: [`${path}/redis.conf`],
    stdin: "null",
    stdout: "null",
    stderr: "piped",
  }).spawn();

  await waitForPort(port);
  return { path, port, process };
}

export async function stopRedis(server: TestServer): Promise<void> {
  try {
    await Deno.remove(server.path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  await ensureTerminated(server.process);
}

export async function ensureTerminated(
  process: Deno.ChildProcess,
): Promise<void> {
  try {
    await process.stderr.cancel();
    process.kill("SIGKILL");
    await process.status;
  } catch (error) {
    const alreadyKilled = error instanceof TypeError &&
      error.message === "Child process has already terminated.";
    if (alreadyKilled) {
      return;
    }
    throw error;
  }
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
