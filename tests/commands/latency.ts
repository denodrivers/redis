import { assertStringIncludes } from "../../deps/std/assert.ts";
import { afterAll, beforeAll, describe, it } from "../../deps/std/testing.ts";
import type { Connector, TestServer } from "../test_util.ts";
import type { Redis } from "../../mod.ts";

export function latencyTests(
  connect: Connector,
  getServer: () => TestServer,
): void {
  let client!: Redis;
  const getOpts = () => ({
    hostname: "127.0.0.1",
    port: getServer().port,
  });
  beforeAll(async () => {
    client = await connect(getOpts());
  });
  afterAll(() => client.close());

  describe("latencyDoctor", () => {
    it("executes `LATENCY DOCTOR`", async () => {
      const report = await client.latencyDoctor();
      assertStringIncludes(
        report,
        "Latency monitoring is disabled in this Redis instance.",
      );
    });
  });
}
