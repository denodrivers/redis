import {
  assertEquals,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { makeTest } from "./test_util.ts";

const { test, client } = await makeTest("geo");

test("geoadd", async () => {
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

test("geohash", async () => {
  await client.geoadd(
    "Sicily",
    [13.361389, 38.115556, "Palermo"],
    [15.087269, 37.502669, "Catania"],
  );
  const resp = await client.geohash("Sicily", "Palermo", "Catania", "Enna");
  assertEquals(resp, ["sqc8b49rny0", "sqdtr74hyu0", undefined]);
});

test("geopos", async () => {
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

test("geodist", async () => {
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

test("georadius", async () => {
  await client.georadius("Test", 0, 1, 10, "km");
});

test("georadiusbymember", async () => {
  await client.georadiusbymember("Sicily", "Palermo", 10, "km");
});
