/**
 * @module
 * @experimental **NOTE**: This is an unstable module.
 */
import { kUnstableCreateProtocol } from "../../internal/symbols.ts";
import type { Redis, RedisConnectOptions } from "../../redis.ts";
import { connect as _connect } from "../../redis.ts";
import { Protocol } from "../../protocol/web_streams/mod.ts";

function createProtocol(conn: Deno.Conn) {
  return new Protocol(conn);
}

export function connect(options: RedisConnectOptions): Promise<Redis> {
  return _connect({
    ...options,
    [kUnstableCreateProtocol]: createProtocol,
  });
}
