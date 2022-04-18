import { add, complete, configure, cycle, suite } from "benny";

export function run({
  driver,
  client,
}) {
  return suite(
    driver,
    configure({ minSamples: 10 }),
    add("ping", async () => {
      await client.ping("HELLO");
    }),
    add("set & get", async () => {
      const key = "foo";
      const value = "bar".repeat(10);
      await client.set(key, value);
      await client.get(key);
    }),
    add("mset & mget", async () => {
      await client.mset({ a: "foo", b: "bar" });
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
  );
}
