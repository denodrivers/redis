import { assertEquals } from "../../vendor/https/deno.land/std/assert/mod.ts";
import {
  afterAll,
  beforeAll,
  it,
} from "../../vendor/https/deno.land/std/testing/bdd.ts";
import type { Connector, TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function hyperloglogTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  beforeAll(async () => {
    const server = getServer();
    client = await connect({ hostname: "127.0.0.1", port: server.port });
  });
  afterAll(() => client.close());

  it("pdfadd", async () => {
    assertEquals(await client.pfadd("hll", "a", "b", "c", "d"), 1);
  });

  it("pdfcount", async () => {
    await client.pfadd("hll", "a", "b", "c", "d");
    assertEquals(await client.pfcount("hll"), 4);
  });

  it("pfmerge", async () => {
    await client.pfadd("hll", "a", "b", "c", "d");
    await client.pfadd("hll2", "1", "2", "3", "4");
    assertEquals(await client.pfmerge("hll", "hll2"), "OK");
  });
}
