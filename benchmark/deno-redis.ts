import { run } from "./benchmark.js";
import { connect } from "../mod.ts";
import { connect as connectWebStreams } from "../experimental/web_streams_connection/mod.ts";

{
  const redis = await connect({
    hostname: "127.0.0.1",
    noDelay: true,
  });
  try {
    await run({
      client: redis,
      driver: "deno-redis",
    });
  } finally {
    await redis.quit();
  }
}

{
  const redis = await connectWebStreams({ hostname: "127.0.0.1" });
  try {
    await run({
      client: redis,
      driver: "deno-redis (experimental/web_streams_connection)",
      outputFilename:
        "deno-redis-with-experimental-web-streams-based-connection",
    });
  } finally {
    await redis.quit();
  }
}
