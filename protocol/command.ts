import {
  BufReader,
  BufWriter,
} from "../vendor/https/deno.land/std/io/bufio.ts";
import { Buffer } from "../vendor/https/deno.land/std/io/buffer.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RedisReply, RedisReplyOrError, RedisValue } from "./types.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

function packRequest(
  buf: Buffer,
  command: string,
  args: RedisValue[],
): void {
  const _args = args.filter((v) => v !== void 0 && v !== null);
  buf.writeSync(ArrayCode);
  buf.writeSync(encoder.encode(String(1 + _args.length)));
  buf.writeSync(CRLF);
  buf.writeSync(BulkCode);
  buf.writeSync(encoder.encode(String(command.length)));
  buf.writeSync(CRLF);
  buf.writeSync(encoder.encode(command));
  buf.writeSync(CRLF);
  for (const arg of _args) {
    const bytes = arg instanceof Uint8Array ? arg : encoder.encode(String(arg));
    const bytesLen = bytes.byteLength;
    buf.writeSync(BulkCode);
    buf.writeSync(encoder.encode(String(bytesLen)));
    buf.writeSync(CRLF);
    buf.writeSync(bytes);
    buf.writeSync(CRLF);
  }
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  command: string,
  ...args: RedisValue[]
): Promise<RedisReply> {
  const buf = new Buffer();
  packRequest(buf, command, args);
  await writer.write(buf.bytes());
  await writer.flush();
  return readReply(reader);
}

export async function sendCommands(
  writer: BufWriter,
  reader: BufReader,
  commands: {
    command: string;
    args: RedisValue[];
  }[],
): Promise<RedisReplyOrError[]> {
  const buf = new Buffer();
  for (const { command, args } of commands) {
    packRequest(buf, command, args);
  }
  await writer.write(buf.bytes());
  await writer.flush();
  const ret: RedisReplyOrError[] = [];
  for (let i = 0; i < commands.length; i++) {
    try {
      const rep = await readReply(reader);
      ret.push(rep);
    } catch (e) {
      if (e instanceof ErrorReplyError) {
        ret.push(e);
      } else {
        throw e;
      }
    }
  }
  return ret;
}
