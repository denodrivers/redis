import { concat } from "../vendor/https/deno.land/std/bytes/concat.ts";
import type * as types from "./types.ts";
import {
  EOFError,
  ErrorReplyError,
  InvalidStateError,
  NotImplementedError,
} from "../errors.ts";
import { decoder } from "./_util.ts";

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);

type ReadLineResult =
  | Omit<ReadableStreamDefaultReadValueResult<Uint8Array>, "done"> & {
    done?: false;
    continuation?: Uint8Array;
  }
  | ReadableStreamDefaultReadDoneResult;

export async function readLine(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<ReadLineResult> {
  const res = await reader.read();
  if (res.done) {
    return res;
  }

  let buf = res.value;
  while (true) {
    const i = buf.lastIndexOf(LF);
    if (i > -1) {
      const j = i - 1;
      if (buf[j] !== CR) {
        throw new InvalidStateError();
      }
      const line = buf.slice(0, j);
      if (buf.byteLength === i + 1) {
        return { value: line };
      } else {
        return { value: line, continuation: buf.slice(i + 1) };
      }
    }

    const res = await reader.read();
    if (res.done) {
      return { done: true };
    }
    buf = concat(buf, res.value);
  }
}

export async function readReply(
  readable: ReadableStream<Uint8Array>,
  returnUint8Arrays?: boolean,
) {
  const reader = readable.getReader();
  const res = await readLine(reader).finally(() => reader.releaseLock());
  if (res.done) {
    throw new EOFError();
  } else if (res.continuation) {
    throw new NotImplementedError();
  }

  const { value: line } = res;
  const code = line[0];
  switch (code) {
    case ErrorReplyCode: {
      throw new ErrorReplyError(decoder.decode(line));
    }
    case IntegerReplyCode: {
      return Number.parseInt(decoder.decode(line.slice(1)));
    }
    case SimpleStringCode: {
      const body = line.slice(1);
      return returnUint8Arrays ? body : decoder.decode(body);
    }
    case BulkReplyCode: {
      const size = Number.parseInt(decoder.decode(line.slice(1)));
      if (size < 0) {
        // nil bulk reply
        return null;
      }
      // NOTE: `Deno.Conn.readable` is a readable byte stream. (https://github.com/denoland/deno/blob/v1.37.2/ext/net/01_net.js#L130)
      const reader = readable.getReader({ mode: "byob" });
      const buf = new Uint8Array(size + 2);
      const res = await reader.read(buf).finally(() => reader.releaseLock());
      if (res.done) {
        throw new EOFError();
      }
      const body = res.value.slice(0, size); // Strip CR and LF.
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
