import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import Buffer = Deno.Buffer;
import { ErrorReplyError } from "./errors.ts";
import { deferred, Deferred } from "./vendor/https/deno.land/std/util/async.ts";
import { CommandExecutor } from "./redis.ts";

export type BulkResult = string | undefined;
export type StatusReply = ["status", string];
export type IntegerReply = ["integer", number];
export type BulkReply = ["bulk", BulkResult];
export type ArrayReply = ["array", any[]];
export type RedisRawReply = StatusReply | IntegerReply | BulkReply | ArrayReply;

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
  command: string,
  ...args: (number | string)[]
): Promise<RedisRawReply> {
  const msg = createRequest(command, ...args);
  await writer.write(encoder.encode(msg));
  await writer.flush();
  return readReply(reader);
}

export async function readReply(reader: BufReader): Promise<RedisRawReply> {
  const res = await reader.peek(1);
  if (res === Deno.EOF) {
    throw Deno.EOF;
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
  throw new Error("Invalid state");
}

export async function readLine(reader: BufReader): Promise<string> {
  let buf = new Uint8Array(1024);
  let loc = 0;
  let d: number | Deno.EOF;
  while ((d = await reader.readByte()) && d !== Deno.EOF) {
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
  throw new Error("Invalid state");
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

export async function readBulkReply(reader: BufReader): Promise<BulkResult> {
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
  return new Buffer(dest.subarray(0, dest.length - 2)).toString();
}

export async function readArrayReply(reader: BufReader): Promise<any[]> {
  const line = await readLine(reader);
  const argCount = parseInt(line.substr(1, line.length - 3));
  const result: any[] = [];
  for (let i = 0; i < argCount; i++) {
    const res = await reader.peek(1);
    if (res === Deno.EOF) {
      throw Deno.EOF;
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

export function muxExecutor(
  r: BufReader,
  w: BufWriter
): CommandExecutor<
  Promise<RedisRawReply>,
  Promise<"OK">,
  Promise<number>,
  Promise<BulkResult>,
  Promise<(number | string | undefined)[]>
> {
  let queue: {
    command: string;
    args: (string | number)[];
    d: Deferred<RedisRawReply>;
  }[] = [];

  function dequeue(): void {
    const [e] = queue;
    if (!e) return;
    sendCommand(w, r, e.command, ...e.args)
      .then(v => e.d.resolve(v))
      .catch(err => e.d.reject(err))
      .finally(() => {
        queue.shift();
        dequeue();
      });
  }

  async function execStatusReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<"OK"> {
    const [_, reply] = await execRawReply(command, ...args);
    return reply as "OK";
  }

  async function execIntegerReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<number> {
    const [_, reply] = await execRawReply(command, ...args);
    return reply as number;
  }

  async function execBulkReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<BulkResult> {
    const [_, reply] = await execRawReply(command, ...args);
    // Note: `reply != null` won't work when `strict` is false #50
    if (typeof reply !== "string" && typeof reply !== "undefined") {
      throw new Error();
    }
    return reply;
  }

  async function execArrayReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<(string | number | undefined)[]> {
    const [_, reply] = await execRawReply(command, ...args);
    return reply as any[];
  }

  async function execRawReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply> {
    const d = deferred<RedisRawReply>();
    queue.push({ command, args, d });
    if (queue.length === 1) {
      dequeue();
    }
    return d;
  }
  return {
    execRawReply,
    execIntegerReply,
    execArrayReply,
    execStatusReply,
    execBulkReply
  };
}
