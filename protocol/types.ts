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
 * @description Represents the **null bulk string** and **null array** in the RESP2 protocol.
 */
export type BulkNil = null;

/**
 * @description Represents the some type in the RESP2 protocol.
 */
export type Raw = SimpleString | Integer | Bulk | ConditionalArray | Binary;

export type Binary = Uint8Array;

/**
 * @description Represents the type of the value returned by `ArrayReply#value()`.
 */
export type ConditionalArray = Raw[];

export type RedisReply = Raw | ConditionalArray;

export type RawOrError = Raw | ErrorReplyError;
