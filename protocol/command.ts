import {
  BufReader,
  BufWriter,
} from "../vendor/https/deno.land/std/io/buffer.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RawOrError, RedisReply, RedisValue } from "./types.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

async function writeRequest(
  writer: BufWriter,
  args: [command: string, ...args: Array<RedisValue>],
) {
  const command = args[0];
  const _args = args.slice(1).filter((v) => v !== void 0 && v !== null);
  await writer.write(ArrayCode);
  await writer.write(encoder.encode(String(1 + _args.length)));
  await writer.write(CRLF);
  await writer.write(BulkCode);
  await writer.write(encoder.encode(String(command.length)));
  await writer.write(CRLF);
  await writer.write(encoder.encode(command));
  await writer.write(CRLF);
  for (const arg of _args) {
    const bytes = arg instanceof Uint8Array ? arg : encoder.encode(String(arg));
    const bytesLen = bytes.byteLength;
    await writer.write(BulkCode);
    await writer.write(encoder.encode(String(bytesLen)));
    await writer.write(CRLF);
    await writer.write(bytes);
    await writer.write(CRLF);
  }
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  args: [command: string, ...args: Array<RedisValue>],
): Promise<RedisReply> {
  await writeRequest(writer, args);
  await writer.flush();
  return readReply(reader);
}

export async function sendCommands(
  writer: BufWriter,
  reader: BufReader,
  commands: Array<[
    command: string,
    ...args: RedisValue[],
  ]>,
): Promise<RawOrError[]> {
  for (const command of commands) {
    await writeRequest(writer, command);
  }
  await writer.flush();
  const ret: RawOrError[] = [];
  for (let i = 0; i < commands.length; i++) {
    try {
      const rep = await readReply(reader);
      ret.push(rep.value());
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
