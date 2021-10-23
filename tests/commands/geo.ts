import { assertEquals } from "../../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient } from "../test_util.ts";
import type { TestServer } from "../test_util.ts";

export async function geoTests(
  t: Deno.TestContext,
  server: TestServer,
): Promise<void> {
  const client = await newClient({ hostname: "127.0.0.1", port: server.port });

  function cleanup(): void {
    client.close();
  }

  await t.step("geoadd", async () => {
    assertEquals(
      await client.geoadd("Sicily", 13.361389, 38.115556, "Palermo"),
      1,
    );
    assertEquals(
      await client.geoadd("Sicily", 15.087269, 37.502669, "Catania"),
      1,
    );
    assertEquals(
      await client.geoadd("Sicily", {
        Palermo: [13.361389, 38.115556],
        Catania: [15.087269, 37.502669],
      }),
      0,
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

  await t.step("geohash", async () => {
    await client.geoadd("Sicily", {
      Palermo: [13.361389, 38.115556],
      Catania: [15.087269, 37.502669],
    });
    const resp = await client.geohash("Sicily", "Palermo", "Catania", "Enna");
    assertEquals(resp, ["sqc8b49rny0", "sqdtr74hyu0", undefined]);
  });

  await t.step("geopos", async () => {
    await client.geoadd("Sicily", {
      Palermo: [13.361389, 38.115556],
      Catania: [15.087269, 37.502669],
    });
    const resp = await client.geopos("Sicily", "Palermo", "Catania", "Enna");
    assertEquals(resp, [
      ["13.36138933897018433", "38.11555639549629859"],
      ["15.08726745843887329", "37.50266842333162032"],
      [],
    ]);
  });

  await t.step("geodist", async () => {
    await client.geoadd("Sicily", {
      Palermo: [13.361389, 38.115556],
      Catania: [15.087269, 37.502669],
    });
    let resp = await client.geodist("Sicily", "Palermo", "Catania");
    assertEquals(resp, "166274.1516");
    resp = await client.geodist("Sicily", "Palermo", "Enna");
    assertEquals(resp, undefined);
  });

  await t.step("georadius", async () => {
    await client.georadius("Test", 0, 1, 10, "km");
  });

  await t.step("georadiusbymember", async () => {
    await client.georadiusbymember("Sicily", "Palermo", 10, "km");
  });

  cleanup();
}
