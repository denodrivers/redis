import {
  BufReader,
  BufWriter,
  EOF
} from "https://deno.land/std@v0.7.0/io/bufio.ts";
import Buffer = Deno.Buffer;
import { ErrorReplyError } from "./errors.ts";

export type RedisRawReply =
  | ["status", string]
  | ["integer", number]
  | ["bulk", string]
  | ["array", any[]]
  | ["error", ErrorReplyError];

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

const encoder = new TextEncoder();

export function createRequest(
  command: string,
  ...args: (string | number)[]
): string {
  const _args = args.filter(v => v !== void 0 && v !== null);
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
  command,
  ...args
): Promise<RedisRawReply> {
  const msg = createRequest(command, ...args);
  await writer.write(encoder.encode(msg));
  await writer.flush();
  return readReply(reader);
}

export async function readReply(reader: BufReader): Promise<RedisRawReply> {
  const res = await reader.peek(1);
  if (res === EOF) {
    throw EOF;
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
}

export async function readLine(reader: BufReader): Promise<string> {
  let buf = new Uint8Array(1024);
  let loc = 0;
  while (true) {
    const d = await reader.readByte();
    if (d === "\r".charCodeAt(0)) {
      const d1 = await reader.readByte();
      if (d1 === "\n".charCodeAt(0)) {
        buf[loc++] = d;
        buf[loc++] = d1;
        return new Buffer(buf.subarray(0, loc)).toString();
      }
    }
    buf[loc++] = d;
  }
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

export async function readBulkReply(reader: BufReader): Promise<string> {
  const line = await readLine(reader);
  if (line[0] !== "$") {
    tryParseErrorReply(line);
  }
  const sizeStr = line.substr(1, line.length - 3);
  const size = parseInt(sizeStr);
  if (size < 0) {
    // nil bulk reply
    return;
  }
  const dest = new Uint8Array(size + 2);
  await reader.readFull(dest);
  return new Buffer(dest.subarray(0, dest.length - 2)).toString();
}

export async function readArrayReply(reader: BufReader): Promise<any[]> {
  const line = await readLine(reader);
  const argCount = parseInt(line.substr(1, line.length - 3));
  const result = [];
  for (let i = 0; i < argCount; i++) {
    const res = await reader.peek(1);
    if (res === EOF) {
      throw EOF;
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

function tryParseErrorReply(line: string) {
  const code = line[0];
  if (code === "-") {
    throw new ErrorReplyError(line);
  }
  throw new Error(`invalid line: ${line}`);
}
