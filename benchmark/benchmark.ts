import {
  bench,
  runBenchmarks,
} from "../vendor/https/deno.land/std/testing/bench.ts";

interface Redis {
  ping(message: string): Promise<string>;
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
    runs: 1000,
    func: async (b) => {
      b.start();
      await client.ping("HELLO");
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
}
