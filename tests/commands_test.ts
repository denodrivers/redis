import { nextPort, startRedis, stopRedis } from "./test_util.ts";
import { aclTests } from "./commands/acl.ts";
import { connectionTests } from "./commands/connection.ts";
import { generalTests } from "./commands/general.ts";
import { geoTests } from "./commands/geo.ts";
import { hashTests } from "./commands/hash.ts";
import { hyperloglogTests } from "./commands/hyper_loglog.ts";
import { keyTests } from "./commands/key.ts";
import { listTests } from "./commands/list.ts";
import { pipelineTests } from "./commands/pipeline.ts";
import { pubsubTests } from "./commands/pubsub.ts";
import { setTests } from "./commands/set.ts";
import { zsetTests } from "./commands/sorted_set.ts";
import { scriptTests } from "./commands/script.ts";
import { streamTests } from "./commands/stream.ts";
import { stringTests } from "./commands/string.ts";

// deno-lint-ignore no-explicit-any
((Deno as any).core as any).setPromiseRejectCallback((error: any) => {
  console.error(["unhandled rejection", error]);
});

Deno.test("commands", async (t) => {
  const port = nextPort();
  const server = await startRedis({ port });
  await t.step("acl", (t) => aclTests(t, server));
  await t.step("connection", (t) => connectionTests(t, server));
  await t.step("general", (t) => generalTests(t, server));
  await t.step("geo", (t) => geoTests(t, server));
  await t.step("hash", (t) => hashTests(t, server));
  await t.step("hyperloglog", (t) => hyperloglogTests(t, server));
  await t.step("key", (t) => keyTests(t, server));
  await t.step("list", (t) => listTests(t, server));
  await t.step("pipeline", (t) => pipelineTests(t, server));
  await t.step("pubsub", (t) => pubsubTests(t, server));
  await t.step("set", (t) => setTests(t, server));
  await t.step("zset", (t) => zsetTests(t, server));
  await t.step("script", (t) => scriptTests(t, server));
  await t.step("stream", (t) => streamTests(t, server));
  await t.step("string", (t) => stringTests(t, server));
  stopRedis(server);
});
