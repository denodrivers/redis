import { assertEquals } from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("geo");
const server = await startRedis({ port: 7005 });
const client = await newClient({ hostname: "127.0.0.1", port: 7005 });

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("geoadd", async () => {
  assertEquals(
    await client.geoadd("Sicily", 13.361389, 38.115556, "Palermo"),
    1,
  );
  assertEquals(
    await client.geoadd("Sicily", 15.087269, 37.502669, "Catania"),
    1,
  );
  assertEquals(
    await client.geoadd(
      "Sicily",
      [13.361389, 38.115556, "Palermo"],
      [15.087269, 37.502669, "Catania"],
    ),
    0,
  );
});

suite.test("geohash", async () => {
  await client.geoadd(
    "Sicily",
    [13.361389, 38.115556, "Palermo"],
    [15.087269, 37.502669, "Catania"],
  );
  const resp = await client.geohash("Sicily", "Palermo", "Catania", "Enna");
  assertEquals(resp, ["sqc8b49rny0", "sqdtr74hyu0", undefined]);
});

suite.test("geopos", async () => {
  await client.geoadd(
    "Sicily",
    [13.361389, 38.115556, "Palermo"],
    [15.087269, 37.502669, "Catania"],
  );
  const resp = await client.geopos("Sicily", "Palermo", "Catania", "Enna");
  assertEquals(resp, [
    ["13.36138933897018433", "38.11555639549629859"],
    ["15.08726745843887329", "37.50266842333162032"],
    [],
  ]);
});

suite.test("geodist", async () => {
  await client.geoadd(
    "Sicily",
    [13.361389, 38.115556, "Palermo"],
    [15.087269, 37.502669, "Catania"],
  );
  let resp = await client.geodist("Sicily", "Palermo", "Catania");
  assertEquals(resp, "166274.1516");
  resp = await client.geodist("Sicily", "Palermo", "Enna");
  assertEquals(resp, undefined);
});

suite.test("georadius", async () => {
  await client.georadius("Test", 0, 1, 10, "km");
});

suite.test("georadiusbymember", async () => {
  await client.georadiusbymember("Sicily", "Palermo", 10, "km");
});

await suite.runTests();
