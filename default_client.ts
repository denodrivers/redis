import type { Client } from "./client.ts";
import type {
  DefaultPubSubMessageType,
  PubSubMessageType,
  RedisSubscription,
  SubscribeCommand,
} from "./subscription.ts";
import type { Connection, SendCommandOptions } from "./connection.ts";
import { kUnstableCreateSubscription } from "./internal/symbols.ts";
import type { RedisReply, RedisValue } from "./protocol/shared/types.ts";

export function createDefaultClient(connection: Connection): Client {
  return new DefaultClient(connection);
}

class DefaultClient implements Client {
  constructor(readonly connection: Connection) {}

  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply> {
    return this.connection.sendCommand(command, args);
  }

  sendCommand(
    command: string,
    args?: RedisValue[],
    options?: SendCommandOptions,
  ) {
    return this.connection.sendCommand(command, args, options);
  }

  async subscribe<
    TMessage extends PubSubMessageType = DefaultPubSubMessageType,
  >(
    command: SubscribeCommand,
    ...channelsOrPatterns: Array<string>
  ): Promise<RedisSubscription<TMessage>> {
    const subscription = this.connection[kUnstableCreateSubscription]<
      TMessage
    >();
    switch (command) {
      case "SUBSCRIBE":
        await subscription.subscribe(...channelsOrPatterns);
        break;
      case "PSUBSCRIBE":
        await subscription.psubscribe(...channelsOrPatterns);
        break;
    }
    return subscription;
  }

  close(): void {
    this.connection.close();
  }
}
