import { ErrorReplyError } from "../errors.ts";

/**
 * @see https://redis.io/topics/protocol
 */

export type RedisValue = string | number | Uint8Array;

/**
 * @description Represents the type of the value returned by `SimpleStringReply#value()`.
 */
export type SimpleString = string;

/**
 * @description Represents the type of the value returned by `IntegerReply#value()`.
 */
export type Integer = number;

/**
 * @description Represents the type of the value returned by `BulkReply#value()`.
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
export type Raw = SimpleString | Integer | Bulk | ConditionalArray;

export type Binary = Uint8Array;

/**
 * @description Represents the type of the value returned by `ArrayReply#value()`.
 */
export type ConditionalArray = Raw[];

export interface RedisReply {
  integer(): Promise<Integer>;
  string(): Promise<SimpleString>;
  bulk(): Promise<Bulk>;
  buffer(): Promise<Uint8Array>;
  array(): Promise<ConditionalArray>;
  value(): Promise<Raw>;
}

export type RedisReplyOrError = RedisReply | ErrorReplyError;
