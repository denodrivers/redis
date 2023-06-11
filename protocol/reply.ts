import { BufReader } from "../vendor/https/deno.land/std/io/buf_reader.ts";
import type * as types from "./types.ts";
import { EOFError, ErrorReplyError, InvalidStateError } from "../errors.ts";
import { decoder, encoder } from "./_util.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

interface Decode<T = unknown> {
  (reply: Uint8Array): T;
}

function decodeIntegerReply(reply: Uint8Array): number {
  return Number.parseInt(decoder.decode(reply));
}
const decode = decoder.decode.bind(decoder);
const decodeSimpleStringReply = decode;
const decodeBulkReply = decode;

export function readReply(reader: BufReader): Promise<types.RedisReply>;
export function readReply<T>(reader: BufReader, decode?: Decode<T>): Promise<T>;
export async function readReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
): Promise<types.RedisReply | unknown> {
  const res = await reader.peek(1);
  if (res == null) {
    throw new EOFError();
  }

  const code = res[0];
  if (code === ErrorReplyCode) {
    await tryReadErrorReply(reader);
  }

  switch (code) {
    case IntegerReplyCode:
      return readIntegerReply(reader, decode);
    case SimpleStringCode:
      return readSimpleStringReply(reader, decode);
    case BulkReplyCode:
      return readBulkReply(reader, decode);
    case ArrayReplyCode:
      return readArrayReply(reader, decode);
    default:
      throw new InvalidStateError(
        `unknown code: '${String.fromCharCode(code)}' (${code})`,
      );
  }
}

async function readIntegerReply(
  reader: BufReader,
): Promise<number>;
async function readIntegerReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
): Promise<T>;
async function readIntegerReply(
  reader: BufReader,
  decode = decodeIntegerReply,
) {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  return decode(line.subarray(1, line.length));
}

function readBulkReply(reader: BufReader): Promise<string | null>;
function readBulkReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
): Promise<T | null>;
async function readBulkReply(
  reader: BufReader,
  decode?: Decode<unknown>,
) {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== BulkReplyCode) {
    tryParseErrorReply(line);
  }

  const size = parseSize(line);
  if (size < 0) {
    // nil bulk reply
    return null;
  }

  const dest = new Uint8Array(size + 2);
  await reader.readFull(dest);
  const body = dest.subarray(0, dest.length - 2); // Strip CR and LF
  if (decode) {
    return decode(body);
  } else {
    return decodeBulkReply(body);
  }
}

async function readSimpleStringReply(
  reader: BufReader,
): Promise<string>;
async function readSimpleStringReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
): Promise<T>;
async function readSimpleStringReply(
  reader: BufReader,
  decode?: Decode<unknown>,
) {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== SimpleStringCode) {
    tryParseErrorReply(line);
  }
  const body = line.subarray(1, line.length);
  if (decode) {
    return decode(body);
  } else {
    return decodeSimpleStringReply(body);
  }
}

export function readArrayReply(
  reader: BufReader,
): Promise<types.ConditionalArray | types.BulkNil>;
export function readArrayReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
): Promise<Array<T>>;
export async function readArrayReply<T>(
  reader: BufReader,
  decode?: Decode<T>,
) {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  const argCount = parseSize(line);
  if (argCount === -1) {
    // `-1` indicates a null array
    return null;
  }

  const array: Array<types.ConditionalArray[0] | Uint8Array | T> = [];
  for (let i = 0; i < argCount; i++) {
    array.push(await readReply(reader, decode));
  }
  return array;
}

export const okReply = encoder.encode("OK");

function tryParseErrorReply(line: Uint8Array): never {
  const code = line[0];
  if (code === ErrorReplyCode) {
    throw new ErrorReplyError(decoder.decode(line));
  }
  throw new Error(`invalid line: ${line}`);
}

async function tryReadErrorReply(reader: BufReader): Promise<never> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }
  tryParseErrorReply(line);
}

async function readLine(reader: BufReader): Promise<Uint8Array> {
  const result = await reader.readLine();
  if (result == null) {
    throw new InvalidStateError();
  }

  const { line } = result;
  return line;
}

function parseSize(line: Uint8Array): number {
  const sizeStr = line.subarray(1, line.length);
  const size = parseInt(decoder.decode(sizeStr));
  return size;
}
