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
): Promise<types.RedisReply> {
  const buffer = new Buffer(encoder.encode("+" + status));
  return Reply.create(BufReader.create(buffer));
}

export function createReply(reader: BufReader): Promise<types.RedisReply> {
  return Reply.create(reader);
}

class Reply implements types.RedisReply {
  #reader: BufReader;
  #code: number;
  #body: Promise<Uint8Array | types.ConditionalArray | null>;

  private constructor(reader: BufReader, code: number) {
    this.#reader = reader;
    this.#code = code;
    this.#body = this.#readBody();
  }

  async #readBody(): Promise<Uint8Array | types.ConditionalArray | null> {
    switch (this.#code) {
      case IntegerReplyCode:
        return await readIntegerReplyBody(this.#reader);
      case SimpleStringCode:
        return await readSimpleStringReplyBody(this.#reader);
      case BulkReplyCode:
        return await readBulkReplyBody(this.#reader);
      case ArrayReplyCode:
        return await readArrayReplyBody(this.#reader);
      default:
        throw new InvalidStateError();
    }
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

    const body = await this.#body as Uint8Array;
    return parseInt(decoder.decode(body));
  }

  async string(): Promise<string> {
    switch (this.#code) {
      case SimpleStringCode:
      case BulkReplyCode:
      case IntegerReplyCode: {
        const body = await this.#body as Uint8Array;
        return decoder.decode(body);
      }
      default:
        throw createParseError(this.#code, "string");
    }
  }

  async bulk(): Promise<types.Bulk> {
    if (this.#code !== BulkReplyCode) {
      throw createParseError(this.#code, "bulk");
    }
    const body = await this.#body;
    return body ? decoder.decode(body as Uint8Array) : undefined;
  }

  async buffer(): Promise<Uint8Array> {
    const body = await this.#body;
    if (!(body instanceof Uint8Array)) {
      throw createParseError(this.#code, "buffer");
    }
    return body;
  }

  async array(): Promise<types.ConditionalArray> {
    if (this.#code !== ArrayReplyCode) {
      throw createParseError(this.#code, "array");
    }

    const body = await this.#body as types.ConditionalArray;
    return body;
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

async function readIntegerReplyBody(reader: BufReader): Promise<Uint8Array> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  return line.subarray(1, line.length);
}

async function readBulkReplyBody(
  reader: BufReader,
): Promise<Uint8Array | null> {
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

async function readSimpleStringReplyBody(
  reader: BufReader,
): Promise<Uint8Array> {
  const line = await readLine(reader);
  if (line == null) {
    throw new InvalidStateError();
  }

  if (line[0] !== SimpleStringCode) {
    tryParseErrorReply(line);
  }
  return line.subarray(1, line.length);
}

export async function readArrayReplyBody(
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
    switch (code) {
      case SimpleStringCode: {
        const reply = await Reply.create(reader);
        array.push(await reply.string());
        break;
      }
      case BulkReplyCode: {
        const reply = await Reply.create(reader);
        array.push(await reply.bulk());
        break;
      }
      case IntegerReplyCode: {
        const reply = await Reply.create(reader);
        array.push(await reply.integer());
        break;
      }
      case ArrayReplyCode: {
        const reply = await readArrayReplyBody(reader);
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
