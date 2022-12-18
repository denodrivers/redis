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
  command: string,
  args: RedisValue[],
) {
  const request = encodeRequest(command, args);
  await writer.write(request);
}

function encodeRequest(
  command: string,
  args: RedisValue[],
): Uint8Array {
  const _args = args.filter((v) => v !== void 0 && v !== null);
  const encodedArgsCount = encoder.encode(
    String(String(1 + _args.length)),
  );
  const encodedCommand = encoder.encode(command);
  const encodedCommandLength = encoder.encode(
    String(encodedCommand.byteLength),
  );
  let totalBytes = (
    ArrayCode.byteLength +
    encodedArgsCount.byteLength +
    CRLF.byteLength +
    BulkCode.byteLength +
    encodedCommandLength.byteLength +
    CRLF.byteLength +
    encodedCommand.byteLength +
    CRLF.byteLength
  );
  const encodedArgs = Array(_args.length);
  for (let i = 0; i < _args.length; i++) {
    const arg = _args[i];
    const bytes = arg instanceof Uint8Array ? arg : encoder.encode(String(arg));
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
    const encodedLength = encoder.encode(String(encodedArg.byteLength));
    index = writeFrom(request, BulkCode, index);
    index = writeFrom(request, encodedLength, index);
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
  writer: BufWriter,
  reader: BufReader,
  command: string,
  args: RedisValue[],
): Promise<RedisReply> {
  await writeRequest(writer, command, args);
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
): Promise<RawOrError[]> {
  for (const { command, args } of commands) {
    await writeRequest(writer, command, args);
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
