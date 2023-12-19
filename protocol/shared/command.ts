import { concat } from "../../vendor/https/deno.land/std/bytes/concat.ts";
import { encoder } from "../../internal/encoding.ts";
import type { RedisValue } from "./types.ts";
import type { Command } from "./protocol.ts";

const CRLF = encoder.encode("\r\n");
const ArrayCode = encoder.encode("*");
const BulkCode = encoder.encode("$");

const kEmptyBuffer = new Uint8Array(0);

export function encodeCommand(
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

export function encodeCommands(commands: Array<Command>): Uint8Array {
  // TODO: find a more optimized solution.
  const bufs: Array<Uint8Array> = Array(commands.length);
  for (let i = 0; i < commands.length; i++) {
    const { command, args } = commands[i];
    bufs[i] = encodeCommand(command, args);
  }
  return concat(bufs);
}
