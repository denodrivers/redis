import { BufReader } from "../vendor/https/deno.land/std/io/bufio.ts";
import type * as types from "./types.ts";
import { EOFError, ErrorReplyError, InvalidStateError } from "../errors.ts";
import { decoder } from "./_util.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

export function unwrapReply(
  reply: types.RedisReplyOrError,
): types.Raw | ErrorReplyError {
  if (reply instanceof ErrorReplyError) {
    return reply;
  }

  switch (reply.type) {
    case "integer":
      return reply.integer();
    case "array":
      return reply.array();
    case "status":
      return reply.status();
    case "string":
      return reply.string();
    default:
      // TODO: Improve error handling
      throw new Error("Unknown reply type: " + reply);
  }
}

export function createStatusReply(status: string): types.StatusReply {
  return new StatusReply(status);
}

export function readArrayReply(reader: BufReader): Promise<types.ArrayReply> {
  return ArrayReply.decode(reader);
}

export async function readReply(
  reader: BufReader,
): Promise<types.RedisReply> {
  const res = await reader.peek(1);
  if (res === null) {
    throw new EOFError();
  }
  switch (res[0]) {
    case IntegerReplyCode:
      return await IntegerReply.decode(reader);
    case SimpleStringCode:
      return await StatusReply.decode(reader);
    case BulkReplyCode:
      return await BulkReply.decode(reader);
    case ArrayReplyCode:
      return await ArrayReply.decode(reader);
    case ErrorReplyCode:
      tryParseErrorReply(await readLine(reader));
  }
  throw new InvalidStateError();
}

class IntegerReply implements types.IntegerReply {
  #integer: types.Integer;

  constructor(integer: types.Integer) {
    this.#integer = integer;
  }

  static async decode(reader: BufReader): Promise<types.IntegerReply> {
    const line = await readLine(reader);
    if (line[0] === ":") {
      const str = line.substr(1, line.length - 3);
      return new IntegerReply(parseInt(str));
    }
    tryParseErrorReply(line);
  }

  get type(): "integer" {
    return "integer";
  }

  integer(): types.Integer {
    return this.#integer;
  }
}

class BulkReply implements types.BulkReply {
  #buffer?: Uint8Array;

  constructor(buffer: Uint8Array | types.BulkNil) {
    this.#buffer = buffer;
  }

  static nil(): types.BulkReply {
    return new BulkReply(undefined);
  }

  static async decode(reader: BufReader): Promise<types.BulkReply> {
    const line = await readLine(reader);
    if (line[0] !== "$") {
      tryParseErrorReply(line);
    }
    const sizeStr = line.substr(1, line.length - 3);
    const size = parseInt(sizeStr);
    if (size < 0) {
      // nil bulk reply
      return BulkReply.nil();
    }
    const dest = new Uint8Array(size + 2);
    await reader.readFull(dest);
    return new BulkReply(dest);
  }

  get type(): "string" {
    return "string";
  }

  string(): types.Bulk {
    return this.#buffer ? decoder.decode(this.#buffer) : undefined;
  }

  buffer(): Uint8Array | types.BulkNil {
    return this.#buffer;
  }
}

class StatusReply implements types.StatusReply {
  #status: string;

  constructor(status: string) {
    this.#status = status;
  }

  static async decode(reader: BufReader): Promise<types.StatusReply> {
    const line = await readLine(reader);
    if (line[0] === "+") {
      return new StatusReply(line.substr(1, line.length - 3));
    }
    tryParseErrorReply(line);
  }

  get type(): "status" {
    return "status";
  }

  status(): types.Status {
    return this.#status;
  }
}

class ArrayReply implements types.ArrayReply {
  #array: types.ConditionalArray;

  constructor(array: types.ConditionalArray) {
    this.#array = array;
  }

  static async decode(reader: BufReader): Promise<types.ArrayReply> {
    const line = await readLine(reader);
    const argCount = parseInt(line.substr(1, line.length - 3));
    const result: types.ConditionalArray = [];
    for (let i = 0; i < argCount; i++) {
      const res = await reader.peek(1);
      if (res === null) {
        throw new EOFError();
      }
      switch (res[0]) {
        case SimpleStringCode: {
          const reply = await StatusReply.decode(reader);
          result.push(reply.status());
          break;
        }
        case BulkReplyCode: {
          const reply = await BulkReply.decode(reader);
          result.push(reply.string());
          break;
        }
        case IntegerReplyCode: {
          const reply = await IntegerReply.decode(reader);
          result.push(reply.integer());
          break;
        }
        case ArrayReplyCode: {
          const reply = await ArrayReply.decode(reader);
          result.push(reply.array());
          break;
        }
      }
    }
    return new ArrayReply(result);
  }

  get type(): "array" {
    return "array";
  }

  array() {
    return this.#array;
  }
}

function tryParseErrorReply(line: string): never {
  const code = line[0];
  if (code === "-") {
    throw new ErrorReplyError(line);
  }
  throw new Error(`invalid line: ${line}`);
}

// TODO Consider using `std/io/bufio.ts` instead
async function readLine(reader: BufReader): Promise<string> {
  const buf = new Uint8Array(1024);
  let loc = 0;
  let d: number | null = null;
  while ((d = await reader.readByte()) && d !== null) {
    if (d === "\r".charCodeAt(0)) {
      const d1 = await reader.readByte();
      if (d1 === "\n".charCodeAt(0)) {
        buf[loc++] = d;
        buf[loc++] = d1;
        return decoder.decode(new Deno.Buffer(buf.subarray(0, loc)).bytes());
      }
    }
    buf[loc++] = d;
  }
  throw new InvalidStateError();
}
