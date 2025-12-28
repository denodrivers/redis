import type { RedisReply, RedisValue } from "./types.ts";
import type { ErrorReplyError } from "../../errors.ts";
import type { TypedEventTarget } from "../../internal/typed_event_target.ts";
import type { ProtocolEvents } from "./types.ts";

export interface Command {
  command: string;
  args: RedisValue[];
  returnUint8Arrays?: boolean;
}

export interface Protocol {
  sendCommand(
    command: string,
    args: Array<RedisValue>,
    returnsUint8Arrays?: boolean,
  ): Promise<RedisReply>;
  readReply(returnsUint8Array?: boolean): Promise<RedisReply>;
  readOrEmitReply(
    eventTarget: TypedEventTarget<ProtocolEvents>,
    returnsUint8Array?: boolean,
  ): Promise<RedisReply>;
  writeCommand(command: Command): Promise<void>;
  pipeline(
    commands: Array<Command>,
  ): Promise<Array<RedisReply | ErrorReplyError>>;
}
