import {
  bench,
  runBenchmarks,
} from "../vendor/https/deno.land/std/testing/bench.ts";

interface Redis {
  ping(message: string): Promise<string>;
  set(key: string, value: string): Promise<string>;
  get(key: string): Promise<string | undefined>;
  flushdb(): Promise<string>;
}

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
  console.table(results);
  await client.flushdb();
}
