import { readReply } from "./reply.ts";
import { ErrorReplyError } from "../errors.ts";
import { encoder } from "./_util.ts";
import type { RedisReply, RedisValue } from "./types.ts";
import { concat } from "../vendor/https/deno.land/std/bytes/concat.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

const kEmptyBuffer = new Uint8Array(0);

async function writeRequest(
  writable: WritableStream<Uint8Array>,
  command: string,
  args: RedisValue[],
) {
  const request = encodeRequest(command, args);
  const writer = writable.getWriter();
  try {
    await writer.write(request);
  } finally {
    writer.releaseLock();
  }
}

export function encodeRequest(
  command: string,
  args: RedisValue[],
): Uint8Array {
  const encodedArgsCount = encoder.encode(
    String(1 + args.length),
  );
  const encodedCommand = encoder.encode(command);
  const encodedCommandLength = encoder.encode(
    String(encodedCommand.byteLength),
  );
  let totalBytes = ArrayCode.byteLength +
    encodedArgsCount.byteLength +
    CRLF.byteLength +
    BulkCode.byteLength +
    encodedCommandLength.byteLength +
    CRLF.byteLength +
    encodedCommand.byteLength +
    CRLF.byteLength;
  const encodedArgs: Array<Uint8Array> = Array(args.length);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const bytes = arg instanceof Uint8Array
      ? arg
      : (arg == null ? kEmptyBuffer : encoder.encode(String(arg)));
    const bytesLen = bytes.byteLength;
    totalBytes += BulkCode.byteLength +
      String(bytesLen).length +
      CRLF.byteLength +
      bytes.byteLength +
      CRLF.byteLength;
    encodedArgs[i] = bytes;
  }

  const request = new Uint8Array(totalBytes);
  let index = 0;
  index = writeFrom(request, ArrayCode, index);
  index = writeFrom(request, encodedArgsCount, index);
  index = writeFrom(request, CRLF, index);
  index = writeFrom(request, BulkCode, index);
  index = writeFrom(request, encodedCommandLength, index);
  index = writeFrom(request, CRLF, index);
  index = writeFrom(request, encodedCommand, index);
  index = writeFrom(request, CRLF, index);
  for (let i = 0; i < encodedArgs.length; i++) {
    const encodedArg = encodedArgs[i];
    const encodedArgLength = encoder.encode(String(encodedArg.byteLength));
    index = writeFrom(request, BulkCode, index);
    index = writeFrom(request, encodedArgLength, index);
    index = writeFrom(request, CRLF, index);
    index = writeFrom(request, encodedArg, index);
    index = writeFrom(request, CRLF, index);
  }

  return request;
}

function writeFrom(
  bytes: Uint8Array,
  payload: Uint8Array,
  fromIndex: number,
): number {
  bytes.set(payload, fromIndex);
  return fromIndex + payload.byteLength;
}

export async function sendCommand(
  writable: WritableStream<Uint8Array>,
  readable: ReadableStream<Uint8Array>,
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
  readable: ReadableStream<Uint8Array>,
  commands: Command[],
): Promise<(RedisReply | ErrorReplyError)[]> {
  const request = encodeRequests(commands);
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

function encodeRequests(commands: Array<Command>): Uint8Array {
  // TODO: find a more optimized solution.
  const bufs: Array<Uint8Array> = Array(commands.length);
  for (let i = 0; i < commands.length; i++) {
    const { command, args } = commands[i];
    bufs[i] = encodeRequest(command, args);
  }
  return concat(...bufs);
}
