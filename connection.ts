import type { Backoff } from "./backoff.ts";
import type { ConnectionEventMap } from "./events.ts";
import type { ErrorReplyError } from "./errors.ts";
import type { TypedEventTarget } from "./internal/typed_event_target.ts";
import type {
  kUnstableCreateProtocol,
  kUnstablePipeline,
  kUnstableProtover,
  kUnstableReadReply,
  kUnstableStartReadLoop,
  kUnstableWriteCommand,
} from "./internal/symbols.ts";
import type { Command, Protocol } from "./protocol/shared/protocol.ts";
import type {
  Protover,
  RedisReply,
  RedisValue,
} from "./protocol/shared/types.ts";

export interface SendCommandOptions {
  /**
   * When this option is set, simple or bulk string replies are returned as `Uint8Array` type.
   *
   * @default false
   */
  returnUint8Arrays?: boolean;
}

export interface Connection extends TypedEventTarget<ConnectionEventMap> {
  /** @deprecated */
  name: string | null;
  isClosed: boolean;
  isConnected: boolean;
  close(): void;
  [Symbol.dispose](): void;
  connect(): Promise<void>;
  reconnect(): Promise<void>;
  sendCommand(
    command: string,
    args?: Array<RedisValue>,
    options?: SendCommandOptions,
  ): Promise<RedisReply>;
  /**
   * @private
   */
  [kUnstableReadReply](returnsUint8Arrays?: boolean): Promise<RedisReply>;
  /**
   * @private
   */
  [kUnstableWriteCommand](command: Command): Promise<void>;
  /**
   * @private
   */
  [kUnstablePipeline](
    commands: Array<Command>,
  ): Promise<Array<RedisReply | ErrorReplyError>>;
  /**
   * @private
   */
  [kUnstableStartReadLoop](
    binaryMode?: boolean,
  ): AsyncIterableIterator<RedisReply>;
}

export interface RedisConnectionOptions {
  tls?: boolean;
  /**
   * A list of root certificates, implies {@linkcode RedisConnectionOptions.tls}
   */
  caCerts?: string[];
  db?: number;
  password?: string;
  username?: string;
  name?: string;
  /**
   * @default 10
   */
  maxRetryCount?: number;
  backoff?: Backoff;
  /**
   * When this option is set, a `PING` command is sent every specified number of seconds.
   */
  healthCheckInterval?: number;

  /**
   * An {@linkcode AbortSignal} which is returned by this function is used to abort an ongoing connection process. With this option, you can implement connection timeout, etc.
   *
   * Works only in Deno v2.3 or later.
   */
  signal?: () => AbortSignal;

  /**
   * If `true`, disables Nagle's algorithm.
   *
   * @default false
   */
  noDelay?: boolean;

  /**
   * @private
   */
  [kUnstableCreateProtocol]?: (conn: Deno.Conn) => Protocol;

  /**
   * @private
   */
  [kUnstableProtover]?: Protover;
}
