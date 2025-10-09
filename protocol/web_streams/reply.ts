import type * as types from "../shared/types.ts";
import {
  ArrayReplyCode,
  BooleanReplyCode,
  BulkReplyCode,
  ErrorReplyCode,
  IntegerReplyCode,
  MapReplyCode,
  NullReplyCode,
  SetReplyCode,
  SimpleStringCode,
} from "../shared/reply.ts";
import { ErrorReplyError, NotImplementedError } from "../../errors.ts";
import { decoder } from "../../internal/encoding.ts";
import type { BufferedReadableStream } from "../../internal/buffered_readable_stream.ts";

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
      return Number.parseInt(decoder.decode(line.subarray(1)));
    }
    case SimpleStringCode: {
      const body = line.slice(1, -2);
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case BulkReplyCode: {
      const size = Number.parseInt(decoder.decode(line.subarray(1)));
      if (size < 0) {
        // nil bulk reply
        return null;
      }
      const buf = await readable.readN(size + 2);
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
    case MapReplyCode: {
      // NOTE: We treat a map type as an array to keep backward compatibility.
      const numberOfFieldValuePairs = Number.parseInt(
        decoder.decode(line.slice(1)),
      );
      if (numberOfFieldValuePairs === -1) {
        return null;
      }
      const entries: Array<types.RedisReply> = [];
      for (let i = 0; i < (numberOfFieldValuePairs * 2); i++) {
        entries.push(await readReply(readable, returnUint8Arrays));
      }
      return entries;
    }
    case SetReplyCode: {
      // NOTE: We treat a set type as an array to keep backward compatibility.
      const size = Number.parseInt(decoder.decode(line.slice(1)));
      if (size === -1) {
        // `-1` indicates a null set
        return null;
      }
      const set: Array<types.RedisReply> = [];
      for (let i = 0; i < size; i++) {
        set.push(await readReply(readable, returnUint8Arrays));
      }
      return set;
    }
    case BooleanReplyCode: {
      const isTrue = line[1] === 116;
      return isTrue
        ? 1 // `#t`
        : 0; // `#f`
    }
    case NullReplyCode: {
      return null;
    }
    default:
      throw new NotImplementedError(
        `'${String.fromCharCode(code)}' reply is not implemented`,
      );
  }
}
