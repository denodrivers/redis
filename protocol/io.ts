import {
  BufReader,
  BufWriter,
} from "../vendor/https/deno.land/std/io/bufio.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RawReplyOrError, RedisRawReply } from "./types.ts";

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
        ret.push(e);
      } else {
        throw e;
      }
    }
  }
  return ret;
}
