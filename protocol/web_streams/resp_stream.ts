import type { RedisReply, RedisValue } from "../shared/types.ts";
import type { Command } from "../shared/protocol.ts";
import { encodeCommand, encodeCommands } from "../shared/command.ts";
import { concateBytes } from "../../internal/concate_bytes.ts";
import {
  ArrayReplyCode,
  BulkReplyCode,
  ErrorReplyCode,
  IntegerReplyCode,
  SimpleStringCode,
} from "../shared/reply.ts";
import { decoder } from "../../internal/encoding.ts";
import { ErrorReplyError, NotImplementedError } from "../../errors.ts";
import type { Deferred } from "../../vendor/https/deno.land/std/async/deferred.ts";
import { deferred } from "../../vendor/https/deno.land/std/async/deferred.ts";

const CR = "\r".charCodeAt(0);
const LF = "\n".charCodeAt(0);
const Imcompleted = Symbol("deno-redis.Imcompleted");
const kEmptyArgs: Array<RedisValue> = [];

interface WriteQueueItemSingleCommand {
  pipelined?: false | null;
  command: Command;
  promise: Deferred<RedisReply | ErrorReplyError>;
}

interface WriteQueueItemPipeline {
  pipelined: true;
  commands: Array<Command>;
  promise: Deferred<Array<RedisReply | ErrorReplyError>>;
}

type WriteQueueItem =
  | WriteQueueItemSingleCommand
  | WriteQueueItemPipeline;

interface ReadQueueItem {
  command?: Command;
  promise: Deferred<RedisReply | ErrorReplyError>;
}

export class RESPStream {
  readonly #conn: Deno.Conn;
  readonly #writeQueue: Array<WriteQueueItem> = [];
  readonly #readQueue: Array<ReadQueueItem> = [];

  #buffer: Uint8Array = new Uint8Array(0);
  #ready: Deferred<void> = deferred();
  #ac = new AbortController();

  constructor(conn: Deno.Conn) {
    const readable = new ReadableStream<Uint8Array>({
      pull: (controller) => this.#pullCommand(controller),
    });
    const writable = new WritableStream<Uint8Array>({
      write: (chunk, controller) => {
        const item = this.#readQueue[0];
        if (this.#handleReply(chunk, controller, item) !== Imcompleted) {
          this.#readQueue.shift();
        }
      },
    });

    readable.pipeTo(conn.writable, { signal: this.#ac.signal }).catch(
      this.#onAborted,
    );
    conn.readable.pipeTo(writable, { signal: this.#ac.signal }).catch(
      this.#onAborted,
    );

    this.#conn = conn;
  }

  async send(command: Command): Promise<RedisReply> {
    const promise = deferred<RedisReply | ErrorReplyError>();
    this.#enqueueWriteQueueItem({ command, promise });
    const r = await promise;
    if (r instanceof ErrorReplyError) {
      throw r;
    }
    return r;
  }

  async readReply(returnUint8Arrays?: boolean): Promise<RedisReply> {
    const promise = deferred<RedisReply | ErrorReplyError>();
    this.#readQueue.push({
      command: { command: "", args: kEmptyArgs, returnUint8Arrays },
      promise,
    });
    const r = await promise;
    if (r instanceof ErrorReplyError) {
      throw r;
    }
    return r;
  }

  pipeline(
    commands: Array<Command>,
  ): Promise<Array<RedisReply | ErrorReplyError>> {
    const promise = deferred<Array<RedisReply | ErrorReplyError>>();
    this.#enqueueWriteQueueItem({
      pipelined: true,
      promise,
      commands,
    });
    return promise;
  }

  close(): void {
    this.#conn.close();
    this.#ac.abort();
  }

  #enqueueWriteQueueItem(item: WriteQueueItem) {
    this.#writeQueue.push(item);
    this.#ready.resolve();
  }

  async #pullCommand(
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): Promise<void> {
    // TODO: Refactor this function.
    const item = this.#writeQueue.shift();
    if (item == null) {
      const ready = this.#ready;
      return ready.then(() => {
        this.#ready = deferred<void>();
        this.#pullCommand(controller);
      });
    }

    if (item.pipelined) {
      controller.enqueue(encodeCommands(item.commands));
      const promises = item.commands.map((command) => {
        const promise = deferred<RedisReply | ErrorReplyError>();
        this.#readQueue.push({ command, promise });
        return promise;
      });
      try {
        const replies = await Promise.all(promises);
        item.promise.resolve(replies);
      } catch (error) {
        controller.error(error);
        item.promise.reject(error);
        return;
      }
    } else {
      const { command: { command, args }, promise } = item;
      controller.enqueue(encodeCommand(command, args));
      this.#readQueue.push(item);
      try {
        await promise;
      } catch (error) {
        controller.error(error);
        promise.reject(error);
        return;
      }
    }

    return Promise.resolve().then(() => this.#pullCommand(controller));
  }

  #handleReply(
    chunk: Uint8Array,
    controller: WritableStreamDefaultController,
    maybePendingItem: ReadQueueItem | undefined,
  ): typeof Imcompleted | void {
    const indexOfLF = chunk.indexOf(LF);
    const isIncomplete = (indexOfLF === -1) ||
      (indexOfLF === 0 && this.#buffer[this.#buffer.length - 1] !== CR) ||
      (chunk[indexOfLF - 1] !== CR);

    if (isIncomplete) {
      this.#buffer = concateBytes(this.#buffer, chunk);
      return Imcompleted;
    }

    const data = concateBytes(this.#buffer, chunk);
    try {
      const parsed = this.#parseReply(data, maybePendingItem?.command);
      if (parsed === Imcompleted) {
        this.#buffer = data;
      } else {
        const [reply, remaining] = parsed;
        maybePendingItem?.promise.resolve(reply);
        this.#buffer = remaining;
      }
    } catch (error) {
      controller.error(error);
      maybePendingItem?.promise.reject(error);
    }
  }

  #parseReply(
    buffer: Uint8Array,
    maybeCommand?: Command,
  ):
    | [reply: RedisReply | ErrorReplyError, remaining: Uint8Array]
    | typeof Imcompleted {
    const indexOfLF = buffer.indexOf(LF);
    if (indexOfLF === -1) {
      return Imcompleted;
    }

    const line = buffer.subarray(0, indexOfLF - 1);
    let remaining = buffer.subarray(indexOfLF + 1);
    switch (line[0]) {
      case SimpleStringCode: {
        const body = line.subarray(1);
        return [
          maybeCommand?.returnUint8Arrays ? body : decoder.decode(body),
          remaining,
        ];
      }
      case IntegerReplyCode: {
        const i = Number.parseInt(decoder.decode(line.subarray(1)));
        return [i, remaining];
      }
      case BulkReplyCode: {
        const size = Number.parseInt(
          decoder.decode(line.subarray(1)),
        );
        if (size < 0) {
          // nil bulk reply
          return [null, remaining];
        }

        const end = size + 2;
        if (remaining.length >= end) {
          const buf = remaining.subarray(0, end - 2);
          const parsed = maybeCommand?.returnUint8Arrays
            ? buf
            : decoder.decode(buf);
          remaining = remaining.subarray(end);
          return [parsed, remaining];
        }

        return Imcompleted;
      }
      case ArrayReplyCode: {
        const size = Number.parseInt(decoder.decode(line.subarray(1)));
        const isNullArray = size === -1; // `-1` indicates a null array
        if (isNullArray) {
          return [null, remaining];
        }

        const array: Array<RedisReply> = [];
        for (let i = 0; i < size; i++) {
          const r = this.#parseReply(remaining, maybeCommand);
          if (r === Imcompleted) {
            return r;
          }
          array.push(r[0] as RedisReply);
          remaining = r[1];
        }
        return [array, remaining];
      }
      case ErrorReplyCode: {
        const error = new ErrorReplyError(decoder.decode(line));
        return [error, remaining];
      }
      default:
        throw new NotImplementedError(
          `'${String.fromCharCode(line[0])}' reply is not implemented`,
        );
    }
  }

  #onAborted(error: unknown) {
    if (!(error instanceof DOMException) || error.name !== "AbortError") {
      throw error;
    }
  }
}
