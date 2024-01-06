import { BufReader } from "../../vendor/https/deno.land/std/io/buf_reader.ts";
import { BufWriter } from "../../vendor/https/deno.land/std/io/buf_writer.ts";
import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../../errors.ts";
import type { RedisReply, RedisValue } from "../shared/types.ts";
import { encodeCommand } from "../shared/command.ts";
import type { Command } from "../shared/protocol.ts";

export async function writeCommand(
  writer: BufWriter,
  command: string,
  args: RedisValue[],
) {
  const request = encodeCommand(command, args);
  await writer.write(request);
}

export async function sendCommand(
  writer: BufWriter,
  reader: BufReader,
  command: string,
  args: RedisValue[],
  returnUint8Arrays?: boolean,
): Promise<RedisReply> {
  await writeCommand(writer, command, args);
  await writer.flush();
  return readReply(reader, returnUint8Arrays);
}

export async function sendCommands(
  writer: BufWriter,
  reader: BufReader,
  commands: Command[],
): Promise<(RedisReply | ErrorReplyError)[]> {
  for (const { command, args } of commands) {
    await writeCommand(writer, command, args);
  }
  await writer.flush();
  const ret: (RedisReply | ErrorReplyError)[] = [];
  for (let i = 0; i < commands.length; i++) {
    try {
      const rep = await readReply(reader, commands[i].returnUint8Arrays);
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
