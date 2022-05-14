import { Buffer, BufReader } from "../vendor/https/deno.land/std/io/buffer.ts";
import type * as types from "./types.ts";
import { EOFError, ErrorReplyError, InvalidStateError } from "../errors.ts";
import { decoder, encoder } from "./_util.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

export function createSimpleStringReply(
  status: string,
): types.RedisReply {
  const buffer = new Buffer(encoder.encode("+" + status));
  return new Reply(BufReader.create(buffer), SimpleStringCode);
}

export function createReply(reader: BufReader): Promise<types.RedisReply> {
  return Reply.create(reader);
}

class Reply implements types.RedisReply {
  #reader: BufReader;
  #code: number;

  constructor(reader: BufReader, code: number) {
    this.#reader = reader;
    this.#code = code;
  }

  static async create(reader: BufReader): Promise<types.RedisReply> {
    const res = await reader.peek(1);
    if (res == null) {
      throw new EOFError();
    }

    const code = res[0];
    if (code === ErrorReplyCode) {
      await tryReadErrorReply(reader);
    }
    return new Reply(reader, code);
  }

  async integer(): Promise<types.Integer> {
    if (this.#code !== IntegerReplyCode) {
      throw createParseError(this.#code, "integer");
    }
    const buffer = await readIntegerReply(this.#reader);
    return parseInt(decoder.decode(buffer));
  }

  async string(): Promise<string> {
    switch (this.#code) {
      case BulkReplyCode: {
        const buffer = await readBulkReply(this.#reader);
        if (buffer == null) {
          throw new InvalidStateError();
        }
        return decoder.decode(buffer);
      }
      case SimpleStringCode: {
        const buffer = await readSimpleStringReply(this.#reader);
        return decoder.decode(buffer);
      }
      default:
        throw createParseError(this.#code, "string");
    }
  }

  async bulk(): Promise<types.Bulk> {
    switch (this.#code) {
      case BulkReplyCode: {
        const buffer = await readBulkReply(this.#reader);
        return buffer ? decoder.decode(buffer) : undefined;
      }
      default: {
        throw createParseError(this.#code, "bulk");
      }
    }
  }

  async buffer(): Promise<Uint8Array> {
    switch (this.#code) {
      case IntegerReplyCode:
        return readIntegerReply(this.#reader);
      case SimpleStringCode:
        return readSimpleStringReply(this.#reader);
      case BulkReplyCode: {
        const buffer = await readBulkReply(this.#reader);
        return buffer ?? new Uint8Array();
      }
      default:
        throw createParseError(this.#code, "buffer");
    }
  }

  array(): Promise<types.ConditionalArray> {
    if (this.#code !== ArrayReplyCode) {
      throw createParseError(this.#code, "array");
    }
    return readArrayReply(this.#reader);
  }

  async value(): Promise<types.Raw> {
    switch (this.#code) {
      case IntegerReplyCode:
        return await this.integer();
      case SimpleStringCode:
        return await this.string();
      case BulkReplyCode:
        return await this.bulk();
      case ArrayReplyCode:
        return await this.array();
      case ErrorReplyCode: {
        await tryReadErrorReply(this.#reader);
      }
    }
    throw new InvalidStateError();
  }
}

async function readIntegerReply(reader: BufReader): Promise<Uint8Array> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  return line.subarray(1, line.length);
}

async function readBulkReply(reader: BufReader): Promise<Uint8Array | null> {
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
  return dest.subarray(0, dest.length - 2); // Strip CR and LF
}

async function readSimpleStringReply(reader: BufReader): Promise<Uint8Array> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== SimpleStringCode) {
    tryParseErrorReply(line);
  }
  return line.subarray(1, line.length);
}

export async function readArrayReply(
  reader: BufReader,
): Promise<types.ConditionalArray> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  const argCount = parseSize(line);
  const array: types.ConditionalArray = [];
  for (let i = 0; i < argCount; i++) {
    const res = await reader.peek(1);
    if (res === null) {
      throw new EOFError();
    }
    const code = res[0];
    switch (res[0]) {
      case SimpleStringCode: {
        const reply = new Reply(reader, code);
        array.push(await reply.string());
        break;
      }
      case BulkReplyCode: {
        const reply = new Reply(reader, code);
        array.push(await reply.bulk());
        break;
      }
      case IntegerReplyCode: {
        const reply = new Reply(reader, code);
        array.push(await reply.integer());
        break;
      }
      case ArrayReplyCode: {
        const reply = await readArrayReply(reader);
        array.push(reply);
        break;
      }
    }
  }
  return array;
}

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

// TODO Consider using `std/io/bufio.ts` instead
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

function createParseError(code: number, expectedType: string): Error {
  return new InvalidStateError(
    `cannot read '${
      String.fromCharCode(code)
    }' type as \`${expectedType}\` value`,
  );
}
