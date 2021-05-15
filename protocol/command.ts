import {
  BufReader,
  BufWriter,
} from "../vendor/https/deno.land/std/io/bufio.ts";
import { BytesList } from "../vendor/https/deno.land/std/bytes/bytes_list.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RedisReply, RedisReplyOrError, RedisValue } from "./types.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

function packRequest(
  bytesList: BytesList,
  command: string,
  args: RedisValue[],
): void {
  const _args = args.filter((v) => v !== void 0 && v !== null);
  bytesList.add(ArrayCode);
  bytesList.add(encoder.encode(String(1 + _args.length)));
  bytesList.add(CRLF);
  bytesList.add(BulkCode);
  bytesList.add(encoder.encode(String(command.length)));
  bytesList.add(CRLF);
  bytesList.add(encoder.encode(command));
  bytesList.add(CRLF);
  for (const arg of _args) {
    const bytes = arg instanceof Uint8Array ? arg : encoder.encode(String(arg));
    const bytesLen = bytes.byteLength;
    bytesList.add(BulkCode);
    bytesList.add(encoder.encode(String(bytesLen)));
    bytesList.add(CRLF);
    bytesList.add(bytes);
    bytesList.add(CRLF);
  }
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  command: string,
  ...args: RedisValue[]
): Promise<RedisReply> {
  const bytesList = new BytesList();
  packRequest(bytesList, command, args);
  await writer.write(bytesList.concat());
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
  const bytesList = new BytesList();
  for (const { command, args } of commands) {
    packRequest(bytesList, command, args);
  }
  await writer.write(bytesList.concat());
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
