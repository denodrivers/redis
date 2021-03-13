import {
  bench,
  runBenchmarks,
} from "../vendor/https/deno.land/std/testing/bench.ts";
import type { Redis } from "../redis.ts";

interface RunOptions {
  driver: string;
  client: Redis;
}

export async function run(options: RunOptions): Promise<void> {
  const {
    driver,
    client,
  } = options;

  bench({
    name: `${driver}: ping`,
    runs: 10000,
    func: async (b) => {
      b.start();
      await client.ping("HELLO");
      b.stop();
    },
  });

  bench({
    name: `${driver}: set & get`,
    runs: 10000,
    func: async (b) => {
      const key = "foo";
      const value = "bar".repeat(10);
      b.start();
      await client.set(key, value);
      await client.get(key);
      b.stop();
    },
  });

  bench({
    name: `${driver}: mset & mget`,
    runs: 10000,
    func: async (b) => {
      b.start();
      await client.mset({ a: "foo", b: "bar" });
      await client.mget("a", "b");
      b.stop();
    },
  });

  const results = await runBenchmarksAndFormatResults();
  console.table(results);
  await client.flushdb();
}

async function runBenchmarksAndFormatResults(): Promise<
  Array<{
    name: string;
    totalMs: number;
    runsCount: number;
    measuredRunsAvgMs: number;
  }>
> {
  const result = await runBenchmarks();
  const results = result.results.map(
    ({ name, totalMs, runsCount, measuredRunsAvgMs }) => {
      return {
        name,
        totalMs,
        runsCount,
        measuredRunsAvgMs,
      };
    },
  );
  return results;
}
