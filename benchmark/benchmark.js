import { add, complete, configure, cycle, save, suite } from "benny";
import { dirname, join } from "node:path";

export function run({
  driver,
  client,
}) {
  const encoder = new TextEncoder();
  return suite(
    driver,
    configure({ minSamples: 10 }),
    add("ping", async () => {
      await client.ping("HELLO");
    }),
    add("set & get", () => {
      const value = "bar".repeat(10);
      return async () => {
        const key = "foo";
        await client.set(key, value);
        await client.get(key);
      };
    }),
    add("set Uint8Array", () => {
      const value = encoder.encode("abcde".repeat(100));
      return async () => {
        const key = "bytes";
        await client.set(key, value);
      };
    }),
    add("mset & mget", async () => {
      await client.mset({ a: "foo", b: encoder.encode("bar") });
      await client.mget("a", "b");
    }),
    add("zadd & zscore", async () => {
      await client.zadd("zset", 1234567, "member");
      await client.zscore("zset", "member");
    }),
    cycle(),
    complete((summary) => {
      const results = summary.results.map((result) => {
        const {
          name,
          ops,
          margin,
          details: {
            min,
            max,
            mean,
            median,
          },
          samples,
        } = result;
        return {
          name,
          ops,
          margin,
          min,
          max,
          mean,
          median,
          samples,
        };
      });
      console.table(results);
    }),
    complete(async () => {
      await client.flushdb();
    }),
    save({
      file: `${driver}-bench`,
      format: "table.html",
      folder: join(dirname(dirname(new URL(import.meta.url).pathname)), "tmp"),
    }),
  );
}
