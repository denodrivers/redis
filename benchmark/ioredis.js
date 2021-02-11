// deno-lint-ignore-file
import { run } from "./benchmark.js";
import { performance } from "perf_hooks";
import Redis from "ioredis";

global.performance = performance;
global.Deno = {};

const redis = new Redis();
redis.on("connect", async () => {
  await run({
    client: redis,
    prefix: "ioredis",
  });

  redis.disconnect();
});
