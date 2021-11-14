import { nextPort, startRedis, stopRedis } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";
import { readAll } from "../../vendor/https/deno.land/std/io/util.ts";
import { delay } from "../../vendor/https/deno.land/std/async/delay.ts";

export interface TestCluster {
  servers: TestServer[];
}

export async function startRedisCluster(ports: number[]): Promise<TestCluster> {
  console.log(ports);
  const servers = await Promise.all(ports.map((port) =>
    startRedis({
      port,
      clusterEnabled: true,
    })
  ));
  const cluster = { servers };
  const redisCLI = Deno.run({
    cmd: [
      "redis-cli",
      "--cluster",
      "create",
      ...ports.map((port) => `127.0.0.1:${port}`),
      "--cluster-replicas",
      "1",
      "--cluster-yes",
    ],
    stderr: "piped",
  });
  try {
    const status = await redisCLI.status();
    if (!status.success) {
      stopRedisCluster(cluster);
      const output = await readAll(redisCLI.stderr);
      const decoder = new TextDecoder();
      throw new Error(decoder.decode(output));
    }

    // Ample time for cluster to finish startup
    await delay(5000);

    return cluster;
  } finally {
    redisCLI.stderr.close();
    redisCLI.close();
  }
}

export function stopRedisCluster(cluster: TestCluster): void {
  for (const server of cluster.servers) {
    stopRedis(server);
  }
}

export function nextPorts(n: number): Array<number> {
  return Array(n).fill(0).map(() => nextPort());
}
