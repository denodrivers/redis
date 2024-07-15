import {
  ensureTerminated,
  nextPort,
  startRedis,
  stopRedis,
} from "../test_util.ts";
import type { TestServer } from "../test_util.ts";
import { readAll } from "../../vendor/https/deno.land/std/io/read_all.ts";
import { readerFromStreamReader } from "../../deps/std/streams.ts";
import { delay } from "../../deps/std/async.ts";

export interface TestCluster {
  servers: TestServer[];
}

export async function startRedisCluster(ports: number[]): Promise<TestCluster> {
  const servers = await Promise.all(ports.map((port) =>
    startRedis({
      port,
      clusterEnabled: true,
      makeClusterConfigFile: true,
    })
  ));
  const cluster = { servers };
  const redisCLI = new Deno.Command("redis-cli", {
    args: [
      "--cluster",
      "create",
      ...ports.map((port) => `127.0.0.1:${port}`),
      "--cluster-replicas",
      "1",
      "--cluster-yes",
    ],
    stderr: "piped",
  }).spawn();
  try {
    // Wait for cluster setup to complete...
    const status = await redisCLI.status;
    if (!status.success) {
      stopRedisCluster(cluster);
      const errOutput = await readAll(
        readerFromStreamReader(redisCLI.stderr.getReader()),
      );
      const decoder = new TextDecoder();
      throw new Error(`Failed to setup cluster: ${decoder.decode(errOutput)}`);
    }

    // Ample time for cluster to finish startup
    await delay(5000);

    return cluster;
  } finally {
    ensureTerminated(redisCLI);
  }
}

export async function stopRedisCluster(cluster: TestCluster): Promise<void> {
  for (const server of cluster.servers) {
    await stopRedis(server);
  }
}

export function nextPorts(n: number): Array<number> {
  return Array(n).fill(0).map(() => nextPort());
}
