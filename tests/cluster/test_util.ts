import { nextPort, startRedis, stopRedis } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";
import { readAll } from "../../vendor/https/deno.land/std/io/util.ts";
import { delay } from "../../vendor/https/deno.land/std/async/delay.ts";

export interface TestCluster {
  servers: TestServer[];
}

export async function startRedisCluster(ports: number[]): Promise<TestCluster> {
  const servers = await Promise.all(ports.map((port) =>
    startRedis({
      port,
      clusterEnabled: true,
      additionalConfigurations: [
        `cluster-config-file tests/server/redis_cluster_${port}.conf`,
      ],
    })
  ));

  await delay(5000);

  const redisCLI = Deno.run({
    cmd: [
      "redis-cli",
      "--cluster",
      "create",
      ...ports.map((port) => `127.0.0.1:${port}`),
      "--cluster-replicas",
      "1",
    ],
    stderr: "piped",
  });
  try {
    const status = await redisCLI.status();
    if (!status.success) {
      const output = await readAll(redisCLI.stderr);
      const decoder = new TextDecoder();
      throw new Error(decoder.decode(output));
    }

    return { servers };
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
