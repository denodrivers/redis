import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";

export class EOFError extends Error {}

export class ConnectionClosedError extends Error {}

export class SubscriptionClosedError extends Error {}

export class ErrorReplyError extends Error {}

export class InvalidStateError extends Error {
  constructor() {
    super("Invalid state");
  }
}

export type Status = string;
export type Integer = number;
export type Bulk = string | undefined;
export type BulkString = string;
export type BulkNil = undefined;
export type Raw = Status | Integer | Bulk | ConditionalArray;
export type ConditionalArray = Raw[];

export type StatusReply = ["status", Status];
export type IntegerReply = ["integer", Integer];
export type BulkReply = ["bulk", Bulk];
export type ArrayReply = ["array", ConditionalArray];
export type ErrorReply = ["error", ErrorReplyError];
export type RedisRawReply = StatusReply | IntegerReply | BulkReply | ArrayReply;
export type RawReplyOrError = RedisRawReply | ErrorReply;

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createRequest(
  command: string,
  args: (string | number)[],
): string {
  const _args = args.filter((v) => v !== void 0 && v !== null);
  let msg = "";
  msg += `*${1 + _args.length}\r\n`;
  msg += `$${command.length}\r\n`;
  msg += `${command}\r\n`;
  for (const arg of _args) {
    const val = String(arg);
    const bytesLen = encoder.encode(val).byteLength;
    msg += `$${bytesLen}\r\n`;
    msg += `${val}\r\n`;
  }
  return msg;
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  command: string,
  ...args: (number | string)[]
): Promise<RedisRawReply> {
  const msg = createRequest(command, args);
  await writer.write(encoder.encode(msg));
  await writer.flush();
  return readReply(reader);
}

export async function sendCommands(
  writer: BufWriter,
  reader: BufReader,
  commands: {
    command: string;
    args: (number | string)[];
  }[],
): Promise<RawReplyOrError[]> {
  const msg = commands.map((c) => createRequest(c.command, c.args)).join("");
  await writer.write(encoder.encode(msg));
  await writer.flush();
  const ret: RawReplyOrError[] = [];
  for (let i = 0; i < commands.length; i++) {
    try {
      const rep = await readReply(reader);
      ret.push(rep);
    } catch (e) {
      if (e instanceof ErrorReplyError) {
        ret.push(["error", e]);
      } else {
        throw e;
      }
    }
  }
  return ret;
}

export async function readReply(reader: BufReader): Promise<RedisRawReply> {
  const res = await reader.peek(1);
  if (res === null) {
    throw new EOFError();
  }
  switch (res[0]) {
    case IntegerReplyCode:
      return ["integer", await readIntegerReply(reader)];
    case SimpleStringCode:
      return ["status", await readStatusReply(reader)];
    case BulkReplyCode:
      return ["bulk", await readBulkReply(reader)];
    case ArrayReplyCode:
      return ["array", await readArrayReply(reader)];
    case ErrorReplyCode:
      tryParseErrorReply(await readLine(reader));
  }
  throw new InvalidStateError();
}

export async function readLine(reader: BufReader): Promise<string> {
  let buf = new Uint8Array(1024);
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

export async function readStatusReply(reader: BufReader): Promise<string> {
  const line = await readLine(reader);
  if (line[0] === "+") {
    return line.substr(1, line.length - 3);
  }
  tryParseErrorReply(line);
}

export async function readIntegerReply(reader: BufReader): Promise<number> {
  const line = await readLine(reader);
  if (line[0] === ":") {
    const str = line.substr(1, line.length - 3);
    return parseInt(str);
  }
  tryParseErrorReply(line);
}

export async function readBulkReply(reader: BufReader): Promise<Bulk> {
  const line = await readLine(reader);
  if (line[0] !== "$") {
    tryParseErrorReply(line);
  }
  const sizeStr = line.substr(1, line.length - 3);
  const size = parseInt(sizeStr);
  if (size < 0) {
    // nil bulk reply
    return undefined;
  }
  const dest = new Uint8Array(size + 2);
  await reader.readFull(dest);
  return decoder.decode(
    new Deno.Buffer(dest.subarray(0, dest.length - 2)).bytes(),
  );
}

export async function readArrayReply(
  reader: BufReader,
): Promise<ConditionalArray> {
  const line = await readLine(reader);
  const argCount = parseInt(line.substr(1, line.length - 3));
  const result: ConditionalArray = [];
  for (let i = 0; i < argCount; i++) {
    const res = await reader.peek(1);
    if (res === null) {
      throw new EOFError();
    }
    switch (res[0]) {
      case SimpleStringCode:
        result.push(await readStatusReply(reader));
        break;
      case BulkReplyCode:
        result.push(await readBulkReply(reader));
        break;
      case IntegerReplyCode:
        result.push(await readIntegerReply(reader));
        break;
      case ArrayReplyCode:
        result.push(await readArrayReply(reader));
        break;
    }
  }
  return result;
}

function tryParseErrorReply(line: string): never {
  const code = line[0];
  if (code === "-") {
    throw new ErrorReplyError(line);
  }
  throw new Error(`invalid line: ${line}`);
}
