import { BufReader } from "../vendor/https/deno.land/std/io/buf_reader.ts";
import type * as types from "./types.ts";
import { EOFError, ErrorReplyError, InvalidStateError } from "../errors.ts";
import { decoder } from "./_util.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

export async function readReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<types.RedisReply> {
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
      return readIntegerReply(reader);
    case SimpleStringCode:
      return readSimpleStringReply(reader, returnUint8Arrays);
    case BulkReplyCode:
      return readBulkReply(reader, returnUint8Arrays);
    case ArrayReplyCode:
      return readArrayReply(reader, returnUint8Arrays);
    default:
      throw new InvalidStateError(
        `unknown code: '${String.fromCharCode(code)}' (${code})`,
      );
  }
}

async function readIntegerReply(
  reader: BufReader,
): Promise<number> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  return Number.parseInt(decoder.decode(line.subarray(1, line.length)));
}

async function readBulkReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary | null> {
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
  return returnUint8Arrays ? body : decoder.decode(body);
}

async function readSimpleStringReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== SimpleStringCode) {
    tryParseErrorReply(line);
  }
  const body = line.subarray(1, line.length);
  return returnUint8Arrays ? body : decoder.decode(body);
}

export async function readArrayReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<Array<types.RedisReply> | null> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  const argCount = parseSize(line);
  if (argCount === -1) {
    // `-1` indicates a null array
    return null;
  }

  const array: Array<types.RedisReply> = [];
  for (let i = 0; i < argCount; i++) {
    array.push(await readReply(reader, returnUint8Arrays));
  }
  return array;
}

export const okReply = "OK";

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
