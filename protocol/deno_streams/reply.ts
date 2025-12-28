import type { BufReader } from "../../deps/std/io.ts";
import type * as types from "../shared/types.ts";
import {
  ArrayReplyCode,
  AttributeReplyCode,
  BigNumberReplyCode,
  BlobErrorReplyCode,
  BooleanReplyCode,
  BulkReplyCode,
  DoubleReplyCode,
  ErrorReplyCode,
  IntegerReplyCode,
  MapReplyCode,
  NullReplyCode,
  PushReplyCode,
  SetReplyCode,
  SimpleStringCode,
  VerbatimStringCode,
} from "../shared/reply.ts";
import { EOFError, ErrorReplyError, InvalidStateError } from "../../errors.ts";
import { decoder } from "../../internal/encoding.ts";

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
    await readErrorReplyOrFail(reader);
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
    case MapReplyCode:
      return readMapReply(reader, returnUint8Arrays);
    case SetReplyCode:
      return readSetReply(reader, returnUint8Arrays);
    case BooleanReplyCode:
      return readBooleanReply(reader);
    case DoubleReplyCode:
      return readDoubleReply(reader, returnUint8Arrays);
    case BigNumberReplyCode:
      return readBigNumberReply(reader, returnUint8Arrays);
    case VerbatimStringCode:
      return readVerbatimStringReply(reader, returnUint8Arrays);
    case NullReplyCode:
      return readNullReply(reader);
    case PushReplyCode:
      return readPushReply(reader, returnUint8Arrays);
    case AttributeReplyCode: {
      await readAttributeReply(reader);
      return readReply(reader, returnUint8Arrays);
    }
    case BlobErrorReplyCode: {
      const body = (await readBlobReply(reader, BlobErrorReplyCode)) as string;
      throw new ErrorReplyError(body);
    }
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

function readBulkReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<BlobLikeReply> {
  return readBlobReply(reader, BulkReplyCode, returnUint8Arrays);
}

function readVerbatimStringReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<BlobLikeReply> {
  return readBlobReply(reader, VerbatimStringCode, returnUint8Arrays);
}

function readSimpleStringReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary> {
  return readSingleLineReply(reader, SimpleStringCode, returnUint8Arrays);
}

function readArrayReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<Array<types.RedisReply> | null> {
  return readArrayLikeReply(reader, returnUint8Arrays);
}

function readPushReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<Array<types.RedisReply> | null> {
  return readArrayLikeReply(reader, returnUint8Arrays);
}

async function readArrayLikeReply(
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

/**
 * NOTE: We treat a set type as an array to keep backward compatibility.
 */
async function readSetReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<Array<types.RedisReply> | null> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  const size = parseSize(line);
  if (size === -1) {
    // `-1` indicates a null set
    return null;
  }

  const set: Array<types.RedisReply> = [];
  for (let i = 0; i < size; i++) {
    set.push(await readReply(reader, returnUint8Arrays));
  }
  return set;
}

/**
 * NOTE: We treat a map type as an array to keep backward compatibility.
 */
async function readMapReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<Array<types.RedisReply> | null> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }
  const numberOfFieldValuePairs = parseSize(line);
  if (numberOfFieldValuePairs === -1) {
    return null;
  }

  const entries: Array<types.RedisReply> = [];
  for (let i = 0; i < (numberOfFieldValuePairs * 2); i++) {
    entries.push(await readReply(reader, returnUint8Arrays));
  }
  return entries;
}

/**
 * NOTE: Currently, we simply drop attributes.
 * TODO: Provide a way for users to capture attributes.
 */
async function readAttributeReply(
  reader: BufReader,
): Promise<void> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }
  const numberOfAttributes = parseSize(line);
  if (numberOfAttributes === -1) {
    return;
  }

  for (let i = 0; i < numberOfAttributes; i++) {
    await readReply(reader); // Reads a key
    await readReply(reader); // Raads a value
  }
}

async function readBooleanReply(reader: BufReader): Promise<1 | 0> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }
  const isTrue = line[1] === 116;
  return isTrue
    ? 1 // `#t`
    : 0; // `#f`
}

function readDoubleReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary> {
  return readSingleLineReply(reader, DoubleReplyCode, returnUint8Arrays);
}

function readBigNumberReply(
  reader: BufReader,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary> {
  return readSingleLineReply(reader, BigNumberReplyCode, returnUint8Arrays);
}

async function readNullReply(reader: BufReader): Promise<null> {
  // Discards the current line
  await readLine(reader);
  return null;
}

async function readSingleLineReply(
  reader: BufReader,
  expectedCode: number,
  returnUint8Arrays?: boolean,
): Promise<string | types.Binary> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== expectedCode) {
    parseErrorReplyOrFail(line);
  }
  const body = line.subarray(1);
  return returnUint8Arrays ? body : decoder.decode(body);
}

type BlobLikeReply = string | types.Binary | null;
async function readBlobReply(
  reader: BufReader,
  expectedCode: number,
  returnUint8Arrays?: boolean,
): Promise<BlobLikeReply> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== expectedCode) {
    parseErrorReplyOrFail(line);
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

function parseErrorReplyOrFail(line: Uint8Array): never {
  const code = line[0];
  if (code === ErrorReplyCode) {
    throw new ErrorReplyError(decoder.decode(line));
  }
  throw new Error(`invalid line: ${line}`);
}

async function readErrorReplyOrFail(reader: BufReader): Promise<never> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }
  parseErrorReplyOrFail(line);
}

async function readLine(reader: BufReader): Promise<Uint8Array> {
  let result = await reader.readLine();
  if (result == null) {
    throw new InvalidStateError();
  }

  let line = result.line;

  while (result?.more) {
    result = await reader.readLine();
    if (result == null) {
      throw new InvalidStateError();
    }
    const mergedLine = new Uint8Array(line.length + result.line.length);
    mergedLine.set(line);
    mergedLine.set(result.line, line.length);
    line = mergedLine;
  }
  return line;
}

function parseSize(line: Uint8Array): number {
  const sizeStr = line.subarray(1, line.length);
  const size = parseInt(decoder.decode(sizeStr));
  return size;
}
