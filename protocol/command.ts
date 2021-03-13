import {
  BufReader,
  BufWriter,
} from "../vendor/https/deno.land/std/io/bufio.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RedisReply, RedisReplyOrError, RedisValue } from "./types.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

function createRequest(
  command: string,
  args: RedisValue[],
): Uint8Array {
  const _args = args.filter((v) => v !== void 0 && v !== null);
  const msg = new Deno.Buffer();
  msg.writeSync(ArrayCode);
  msg.writeSync(encoder.encode(String(1 + _args.length)));
  msg.writeSync(CRLF);
  msg.writeSync(BulkCode);
  msg.writeSync(encoder.encode(String(command.length)));
  msg.writeSync(CRLF);
  msg.writeSync(encoder.encode(command));
  msg.writeSync(CRLF);
  for (const arg of _args) {
    const bytes = arg instanceof Uint8Array ? arg : encoder.encode(String(arg));
    const bytesLen = bytes.byteLength;
    msg.writeSync(BulkCode);
    msg.writeSync(encoder.encode(String(bytesLen)));
    msg.writeSync(CRLF);
    msg.writeSync(bytes);
    msg.writeSync(CRLF);
  }
  return msg.bytes();
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  command: string,
  ...args: RedisValue[]
): Promise<RedisReply> {
  const msg = createRequest(command, args);
  await writer.write(msg);
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
  const requests = commands.map((c) => createRequest(c.command, c.args));
  for (const request of requests) {
    await writer.write(request);
  }
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
