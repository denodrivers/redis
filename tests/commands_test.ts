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
import { connect } from "../redis.ts";
import { connect as connectWebStreamsConnection } from "../experimental/web_streams_connection/mod.ts";

import {
  afterAll,
  beforeAll,
  describe,
} from "../deps/testing.ts";

describe("commands", () => {
  let port!: number;
  let server!: TestServer;
  beforeAll(async () => {
    port = nextPort();
    server = await startRedis({ port });
  });
  afterAll(() => stopRedis(server));

  const getServer = () => server;

  for (
    const [kind, connector] of [
      ["deno_streams connection", connect] as const,
      [
        "experimental web_streams connection",
        connectWebStreamsConnection,
      ] as const,
    ]
  ) {
    describe(kind, () => {
      describe("acl", () => aclTests(connector, getServer));
      describe("connection", () => connectionTests(connector, getServer));
      describe("general", () => generalTests(connector, getServer));
      describe("geo", () => geoTests(connector, getServer));
      describe("hash", () => hashTests(connector, getServer));
      describe("hyperloglog", () => hyperloglogTests(connector, getServer));
      describe("key", () => keyTests(connector, getServer));
      describe("list", () => listTests(connector, getServer));
      describe("pipeline", () => pipelineTests(connector, getServer));
      describe("pubsub", () => pubsubTests(connector, getServer));
      describe("set", () => setTests(connector, getServer));
      describe("zset", () => zsetTests(connector, getServer));
      describe("script", () => scriptTests(connector, getServer));
      describe("stream", () => streamTests(connector, getServer));
      describe("string", () => stringTests(connector, getServer));
    });
  }
});
