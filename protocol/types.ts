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

export type RedisReply =
  | IntegerReply
  | BulkReply
  | StatusReply
  | ArrayReply;

export type RedisReplyOrError = RedisReply | ErrorReplyError;

// TODO(uki00a): Add `attributes()` methods when implementing RESP3
export interface Reply<T> {
  type: string;
  value(): T;
}

export interface IntegerReply extends Reply<Integer> {
  type: "integer";
  value(): Integer;
}

export interface BulkReply extends Reply<Bulk> {
  type: "string";
  value(): Bulk;
  buffer(): Uint8Array | BulkNil;
}

export interface StatusReply extends Reply<Status> {
  type: "status";
  value(): Status;
}

export interface ArrayReply extends Reply<ConditionalArray> {
  type: "array";
  value(): ConditionalArray;
}
