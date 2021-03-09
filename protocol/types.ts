import { ErrorReplyError } from "../errors.ts";

/**
 * @see https://redis.io/topics/protocol
 */

/**
 * @description Represents the **simple string** type in the RESP2 protocol.
 */
export type Status = string;

/**
 * @description Represents the **integer** type in the RESP2 protocol.
 */
export type Integer = number;

/**
 * @description Represents the **bulk string** or **null bulk string** in the RESP2 protocol.
 */
export type Bulk = BulkString | BulkNil;

/**
 * @description Represents the **bulk string** type in the RESP2 protocol.
 */
export type BulkString = string;

/**
 * @description Represents the **null bulk string** in the RESP2 protocol.
 */
export type BulkNil = undefined;

/**
 * @description Represents the some type in the RESP2 protocol.
 */
export type Raw = Status | Integer | Bulk | ConditionalArray;

/**
 * @description Represents the **array** type in the RESP2 protocol.
 */
export type ConditionalArray = Raw[];

export type RedisRawReply =
  | IntegerReply
  | BulkReply
  | StatusReply
  | ArrayReply;

export type RawReplyOrError = RedisRawReply | ErrorReplyError;

// TODO(uki00a): Add `attributes()` methods when implementing RESP3
export interface Reply {
  type: string;
}

export interface IntegerReply extends Reply {
  type: "integer";
  integer(): Integer;
}

export interface BulkReply extends Reply {
  type: "string";
  string(): Bulk;
  buffer(): Uint8Array | BulkNil;
}

export interface StatusReply extends Reply {
  type: "status";
  status(): Status;
}

export interface ArrayReply extends Reply {
  type: "array";
  array(): ConditionalArray;
}
