import { kUnstableProtocol } from "../../internal/symbols.ts";
import type { RedisConnectOptions } from "../../redis.ts";
import { connect as _connect } from "../../redis.ts";

export function connect(options: RedisConnectOptions) {
  return _connect({
    ...options,
    [kUnstableProtocol]: new Protocol(),
  });
}
