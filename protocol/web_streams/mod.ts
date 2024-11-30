import { sendCommand, sendCommands, writeCommand } from "./command.ts";
import { readReply } from "./reply.ts";
import type { Command, Protocol as BaseProtocol } from "../shared/protocol.ts";
import type { RedisReply, RedisValue } from "../shared/types.ts";
import type { ErrorReplyError } from "../../errors.ts";
import { BufferedReadableStream } from "../../internal/buffered_readable_stream.ts";

export class Protocol implements BaseProtocol {
  #readable: BufferedReadableStream;
  #writable: WritableStream<Uint8Array>;
  constructor(conn: Deno.Conn) {
    this.#readable = new BufferedReadableStream(conn.readable);
    this.#writable = conn.writable;
  }
  sendCommand(
    command: string,
    args: RedisValue[],
    returnsUint8Arrays?: boolean | undefined,
  ): Promise<RedisReply> {
    return sendCommand(
      this.#writable,
      this.#readable,
      command,
      args,
      returnsUint8Arrays,
    );
  }

  readReply(returnsUint8Arrays?: boolean): Promise<RedisReply> {
    return readReply(this.#readable, returnsUint8Arrays);
  }

  writeCommand(command: Command): Promise<void> {
    return writeCommand(this.#writable, command.command, command.args);
  }

  pipeline(commands: Command[]): Promise<Array<RedisReply | ErrorReplyError>> {
    return sendCommands(this.#writable, this.#readable, commands);
  }
}
