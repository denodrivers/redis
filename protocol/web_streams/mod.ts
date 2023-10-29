import type { Command, Protocol as BaseProtocol } from "../shared/protocol.ts";
import { RedisReply, RedisValue } from "../shared/types.ts";
import { ErrorReplyError } from "../../errors.ts";
import { RESPStream } from "./resp_stream.ts";

export class Protocol implements BaseProtocol {
  #resp: RESPStream;
  constructor(conn: Deno.Conn) {
    this.#resp = new RESPStream(conn);
  }
  sendCommand(
    command: string,
    args: RedisValue[],
    returnUint8Arrays?: boolean | undefined,
  ): Promise<RedisReply> {
    return this.#resp.send({ command, args, returnUint8Arrays });
  }

  readReply(returnsUint8Arrays?: boolean): Promise<RedisReply> {
    return this.#resp.readReply(returnsUint8Arrays);
  }

  pipeline(commands: Command[]): Promise<Array<RedisReply | ErrorReplyError>> {
    return this.#resp.pipeline(commands);
  }

  close(): void {
    return this.#resp.close();
  }
}
