import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
type Closer = Deno.Closer;

export interface CommandExecutor<TReply> {
  exec(command: string, ...args: (string | number)[]): Promise<TReply>;
}

export interface Connection<TReply> {
  maxRetryCount: number;
  closer: Closer;
  reader: BufReader;
  writer: BufWriter;
  executor: CommandExecutor<TReply>;
  exec: CommandExecutor<TReply>["exec"];
  isConnected: boolean;
  isClosed: boolean;
  close(): void;
  connect(): Promise<void>;
  reconnect(): Promise<void>;
}
