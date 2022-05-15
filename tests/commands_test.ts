import { nextPort, startRedis, stopRedis } from "./test_util.ts";
import type { TestServer } from "./test_util.ts";
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

import {
  afterAll,
  beforeAll,
  describe,
  it,
} from "../vendor/https/deno.land/std/testing/bdd.ts";

describe("commands", () => {
  let port!: number;
  let server!: TestServer;
  beforeAll(async () => {
    port = nextPort();
    server = await startRedis({ port });
  });
  afterAll(() => stopRedis(server));

  describe("acl", () => aclTests(server));
  describe("connection", () => connectionTests(server));
  describe("general", () => generalTests(server));
  describe("geo", () => geoTests(server));
  describe("hash", () => hashTests(server));
  describe("hyperloglog", () => hyperloglogTests(server));
  describe("key", () => keyTests(server));
  describe("list", () => listTests(server));
  describe("pipeline", () => pipelineTests(server));
  describe("pubsub", () => pubsubTests(server));
  describe("set", () => setTests(server));
  describe("zset", () => zsetTests(server));
  describe("script", () => scriptTests(server));
  describe("stream", () => streamTests(server));
  describe("string", () => stringTests(server));
});
