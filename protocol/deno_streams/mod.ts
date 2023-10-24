import { BufReader } from "../../vendor/https/deno.land/std/io/buf_reader.ts";
import { BufWriter } from "../../vendor/https/deno.land/std/io/buf_writer.ts";
import { readReply } from "./reply.ts";
import { sendCommand, sendCommands } from "./command.ts";

import type { Command, Protocol as BaseProtocol } from "../shared/protocol.ts";
import { RedisReply, RedisValue } from "../shared/types.ts";
import { ErrorReplyError } from "../../errors.ts";

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

  pipeline(commands: Command[]): Promise<Array<RedisReply | ErrorReplyError>> {
    return sendCommands(this.#writer, this.#reader, commands);
  }
}
