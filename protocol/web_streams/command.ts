import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../../errors.ts";
import type { BufferedReadableStream } from "../../internal/buffered_readable_stream.ts";
import type { RedisReply, RedisValue } from "../shared/types.ts";
import { encodeCommand, encodeCommands } from "../shared/command.ts";

async function writeRequest(
  writable: WritableStream<Uint8Array>,
  command: string,
  args: RedisValue[],
) {
  const request = encodeCommand(command, args);
  const writer = writable.getWriter();
  try {
    await writer.write(request);
  } finally {
    writer.releaseLock();
  }
}

export async function sendCommand(
  writable: WritableStream<Uint8Array>,
  readable: BufferedReadableStream,
  command: string,
  args: RedisValue[],
  returnUint8Arrays?: boolean,
): Promise<RedisReply> {
  await writeRequest(writable, command, args);
  return readReply(readable, returnUint8Arrays);
}

export interface Command {
  command: string;
  args: RedisValue[];
  returnUint8Arrays?: boolean;
}

export async function sendCommands(
  writable: WritableStream<Uint8Array>,
  readable: BufferedReadableStream,
  commands: Command[],
): Promise<(RedisReply | ErrorReplyError)[]> {
  const request = encodeCommands(commands);
  const writer = writable.getWriter();
  try {
    await writer.write(request);
  } finally {
    writer.releaseLock();
  }

  const ret: (RedisReply | ErrorReplyError)[] = [];
  for (let i = 0; i < commands.length; i++) {
    try {
      const rep = await readReply(readable, commands[i].returnUint8Arrays);
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
