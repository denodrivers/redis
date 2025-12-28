import { BufReader, BufWriter } from "../../deps/std/io.ts";
import { readOrEmitReply, readReply } from "./reply.ts";
import { sendCommand, sendCommands, writeCommand } from "./command.ts";

import type { Command, Protocol as BaseProtocol } from "../shared/protocol.ts";
import type {
  ProtocolEvents,
  RedisReply,
  RedisValue,
} from "../shared/types.ts";
import type { ErrorReplyError } from "../../errors.ts";
import type { TypedEventTarget } from "../../internal/typed_event_target.ts";

export class Protocol implements BaseProtocol {
  #reader: BufReader;
  #writer: BufWriter;

  constructor(conn: Deno.Conn) {
    this.#reader = new BufReader(conn);
    this.#writer = new BufWriter(conn);
  }

  sendCommand(
    command: string,
    args: RedisValue[],
    returnsUint8Arrays?: boolean | undefined,
  ): Promise<RedisReply> {
    return sendCommand(
      this.#writer,
      this.#reader,
      command,
      args,
      returnsUint8Arrays,
    );
  }

  readReply(returnsUint8Arrays?: boolean): Promise<RedisReply> {
    return readReply(this.#reader, returnsUint8Arrays);
  }

  readOrEmitReply(
    eventTarget: TypedEventTarget<ProtocolEvents>,
    returnsUint8Arrays?: boolean,
  ): Promise<RedisReply> {
    return readOrEmitReply(this.#reader, eventTarget, returnsUint8Arrays);
  }

  async writeCommand(command: Command): Promise<void> {
    await writeCommand(this.#writer, command.command, command.args);
    await this.#writer.flush();
  }

  pipeline(commands: Command[]): Promise<Array<RedisReply | ErrorReplyError>> {
    return sendCommands(this.#writer, this.#reader, commands);
  }
}
