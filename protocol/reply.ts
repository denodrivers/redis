import type * as types from "./types.ts";
import { ErrorReplyError, NotImplementedError } from "../errors.ts";
import { decoder } from "./_util.ts";
import type { BufferedReadableStream } from "../internal/buffered_readable_stream.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

export async function readReply(
  readable: BufferedReadableStream,
  returnUint8Arrays?: boolean,
) {
  const line = await readable.readLine();
  const code = line[0];
  switch (code) {
    case ErrorReplyCode: {
      throw new ErrorReplyError(decoder.decode(line));
    }
    case IntegerReplyCode: {
      return Number.parseInt(decoder.decode(line.slice(1)));
    }
    case SimpleStringCode: {
      const body = line.slice(1, -2);
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case BulkReplyCode: {
      const size = Number.parseInt(decoder.decode(line.slice(1)));
      if (size < 0) {
        // nil bulk reply
        return null;
      }
      const buf = new Uint8Array(size + 2);
      await readable.readFull(buf);
      const body = buf.subarray(0, size); // Strip CR and LF.
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case ArrayReplyCode: {
      const size = Number.parseInt(decoder.decode(line.slice(1)));
      if (size === -1) {
        // `-1` indicates a null array
        return null;
      }
      const array: Array<types.RedisReply> = [];
      for (let i = 0; i < size; i++) {
        array.push(await readReply(readable, returnUint8Arrays));
      }
      return array;
    }
    default:
      throw new NotImplementedError(
        `'${String.fromCharCode(code)}' reply is not implemented`,
      );
  }
}

export const okReply = "OK";
