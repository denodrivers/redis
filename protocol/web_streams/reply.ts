import type * as types from "../shared/types.ts";
import {
  ArrayReplyCode,
  AttributeReplyCode,
  BigNumberReplyCode,
  BlobErrorReplyCode,
  BooleanReplyCode,
  BulkReplyCode,
  DoubleReplyCode,
  ErrorReplyCode,
  IntegerReplyCode,
  MapReplyCode,
  NullReplyCode,
  PushReplyCode,
  SetReplyCode,
  SimpleStringCode,
  VerbatimStringCode,
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
    case BulkReplyCode:
    case VerbatimStringCode: {
      const size = Number.parseInt(decoder.decode(line.subarray(1)));
      if (size < 0) {
        // nil bulk reply
        return null;
      }
      const buf = await readable.readN(size + 2);
      const body = buf.subarray(0, size); // Strip CR and LF.
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case BlobErrorReplyCode: {
      const size = Number.parseInt(decoder.decode(line.subarray(1)));
      const buf = await readable.readN(size + 2);
      const body = buf.subarray(0, size); // Strip CR and LF.
      throw new ErrorReplyError(decoder.decode(body));
    }
    case ArrayReplyCode:
    case PushReplyCode: {
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
    case BigNumberReplyCode:
    case DoubleReplyCode: {
      const body = line.subarray(1, -2);
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case NullReplyCode: {
      return null;
    }
    case AttributeReplyCode: {
      // NOTE: Currently, we simply drop attributes.
      // TODO: Provide a way for users to capture attributes.
      const numberOfAttributes = Number.parseInt(
        decoder.decode(line.slice(1)),
      );
      if (numberOfAttributes === -1) {
        return readReply(readable, returnUint8Arrays); // Reads the next reply.
      }
      for (let i = 0; i < numberOfAttributes; i++) {
        await readReply(readable, returnUint8Arrays); // Reads a key
        await readReply(readable, returnUint8Arrays); // Reads a value
      }

      return readReply(readable, returnUint8Arrays); // Reads the next reply.
    }
    default:
      throw new NotImplementedError(
        `'${String.fromCharCode(code)}' reply is not implemented`,
      );
  }
}
