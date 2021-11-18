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
        // TODO: The configuration file should be created in `test/tmp/<port>` directory.
        `cluster-config-file ${port}_nodes.conf`,
      ],
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
    stdout: "piped",
    stderr: "piped",
  });
  try {
    const status = await redisCLI.status();
    if (!status.success) {
      stopRedisCluster(cluster);
      const output = await readAll(redisCLI.stderr);
      const decoder = new TextDecoder();
      throw new Error(`Failed to setup a cluster: ${decoder.decode(output)}`);
    }
    // Wait for cluster setup to complete...
    await redisCLI.output();

    return cluster;
  } finally {
    tryClose(redisCLI.stdout);
    tryClose(redisCLI.stderr);
    tryClose(redisCLI);
  }
}

function tryClose(closer: Deno.Closer): void {
  try {
    closer.close();
  } catch (error) {
    if (!(error instanceof Deno.errors.BadResource)) {
      throw error;
    }
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
