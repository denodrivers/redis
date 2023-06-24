import { sendCommand } from "./protocol/mod.ts";
import type { RedisReply, RedisValue } from "./protocol/mod.ts";
import type { Backoff } from "./backoff.ts";
import { exponentialBackoff } from "./backoff.ts";
import { ErrorReplyError, isRetriableError } from "./errors.ts";
import { BufReader } from "./vendor/https/deno.land/std/io/buf_reader.ts";
import { BufWriter } from "./vendor/https/deno.land/std/io/buf_writer.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";
import { delay } from "./vendor/https/deno.land/std/async/delay.ts";
type Closer = Deno.Closer;

export interface SendCommandOptions {
  /**
   * When this option is set, simple or bulk string replies are returned as `Uint8Array` type.
   *
   * @default false
   */
  returnUint8Arrays?: boolean;
}

export interface Connection {
  reader: BufReader;
  writer: BufWriter;
  isClosed: boolean;
  isConnected: boolean;
  close(): void;
  connect(): Promise<void>;
  reconnect(): Promise<void>;
  sendCommand(
    command: string,
    args?: Array<RedisValue>,
    options?: SendCommandOptions,
  ): Promise<RedisReply>;
}

export interface RedisConnectionOptions {
  tls?: boolean;
  db?: number;
  password?: string;
  username?: string;
  name?: string;
  /**
   * @default 10
   */
  maxRetryCount?: number;
  backoff?: Backoff;
  /**
   * When this option is set, a `PING` command is sent every specified number of seconds.
   */
  healthCheckInterval?: number;
}

export const kEmptyRedisArgs: Array<RedisValue> = [];

interface Command {
  name: string;
  args: RedisValue[];
  promise: Deferred<RedisReply>;
  returnUint8Arrays?: boolean;
}

export class RedisConnection implements Connection {
  name: string | null = null;
  reader!: BufReader;
  writer!: BufWriter;
  private closer!: Closer;
  private maxRetryCount = 10;

  private readonly hostname: string;
  private readonly port: number | string;
  private _isClosed = false;
  private _isConnected = false;
  private backoff: Backoff;

  private commandQueue: Command[] = [];

  get isClosed(): boolean {
    return this._isClosed;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isRetriable(): boolean {
    return this.maxRetryCount > 0;
  }

  constructor(
    hostname: string,
    port: number | string,
    private options: RedisConnectionOptions,
  ) {
    this.hostname = hostname;
    this.port = port;
    if (options.name) {
      this.name = options.name;
    }
    if (options.maxRetryCount != null) {
      this.maxRetryCount = options.maxRetryCount;
    }
    this.backoff = options.backoff ?? exponentialBackoff();
  }

  private async authenticate(
    username: string | undefined,
    password: string,
  ): Promise<void> {
    try {
      password && username
        ? await this.sendCommand("AUTH", [username, password])
        : await this.sendCommand("AUTH", [password]);
    } catch (error) {
      if (error instanceof ErrorReplyError) {
        throw new AuthenticationError("Authentication failed", {
          cause: error,
        });
      } else {
        throw error;
      }
    }
  }

  private async selectDb(
    db: number | undefined = this.options.db,
  ): Promise<void> {
    if (!db) throw new Error("The database index is undefined.");
    await this.sendCommand("SELECT", [db]);
  }

  sendCommand(
    command: string,
    args?: Array<RedisValue>,
    options?: SendCommandOptions,
  ): Promise<RedisReply> {
    const promise = deferred<RedisReply>();
    this.commandQueue.push({
      name: command,
      args: args ?? kEmptyRedisArgs,
      promise,
      returnUint8Arrays: options?.returnUint8Arrays,
    });
    if (this.commandQueue.length === 1) {
      this.processCommandQueue();
    }
    return promise;
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    await this.#connect(0);
  }

  async #connect(retryCount: number) {
    try {
      const dialOpts: Deno.ConnectOptions = {
        hostname: this.hostname,
        port: parsePortLike(this.port),
      };
      const conn: Deno.Conn = this.options?.tls
        ? await Deno.connectTls(dialOpts)
        : await Deno.connect(dialOpts);

      this.closer = conn;
      this.reader = new BufReader(conn);
      this.writer = new BufWriter(conn);
      this._isClosed = false;
      this._isConnected = true;

      try {
        if (this.options.password != null) {
          await this.authenticate(this.options.username, this.options.password);
        }
        if (this.options.db) {
          await this.selectDb(this.options.db);
        }
      } catch (error) {
        this.close();
        throw error;
      }

      this.#enableHealthCheckIfNeeded();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw (error.cause ?? error);
      }

      const backoff = this.backoff(retryCount);
      retryCount++;
      if (retryCount >= this.maxRetryCount) {
        throw error;
      }
      await delay(backoff);
      await this.#connect(retryCount);
    }
  }

  close() {
    this._isClosed = true;
    this._isConnected = false;
    try {
      this.closer!.close();
    } catch (error) {
      if (!(error instanceof Deno.errors.BadResource)) throw error;
    }
  }

  async reconnect(): Promise<void> {
    if (!this.reader.peek(1)) {
      throw new Error("Client is closed.");
    }
    try {
      await this.sendCommand("PING");
      this._isConnected = true;
    } catch (_error) { // TODO: Maybe we should log this error.
      this.close();
      await this.connect();
      await this.sendCommand("PING");
    }
  }

  private async processCommandQueue() {
    const [command] = this.commandQueue;
    if (!command) return;

    try {
      const reply = await sendCommand(
        this.writer,
        this.reader,
        command.name,
        command.args,
        command.returnUint8Arrays,
      );
      command.promise.resolve(reply);
    } catch (error) {
      if (
        !isRetriableError(error) ||
        this.isManuallyClosedByUser()
      ) {
        return command.promise.reject(error);
      }

      for (let i = 0; i < this.maxRetryCount; i++) {
        // Try to reconnect to the server and retry the command
        this.close();
        try {
          await this.connect();

          const reply = await sendCommand(
            this.writer,
            this.reader,
            command.name,
            command.args,
            command.returnUint8Arrays,
          );

          return command.promise.resolve(reply);
        } catch { // TODO: use `AggregateError`?
          const backoff = this.backoff(i);
          await delay(backoff);
        }
      }

      command.promise.reject(error);
    } finally {
      this.commandQueue.shift();
      this.processCommandQueue();
    }
  }

  private isManuallyClosedByUser(): boolean {
    return this._isClosed && !this._isConnected;
  }

  #enableHealthCheckIfNeeded() {
    const { healthCheckInterval } = this.options;
    if (healthCheckInterval == null) {
      return;
    }

    const ping = async () => {
      if (this.isManuallyClosedByUser()) {
        return;
      }

      try {
        await this.sendCommand("PING");
        this._isConnected = true;
      } catch {
        // TODO: notify the user of an error
        this._isConnected = false;
      } finally {
        setTimeout(ping, healthCheckInterval);
      }
    };

    setTimeout(ping, healthCheckInterval);
  }
}

class AuthenticationError extends Error {}

function parsePortLike(port: string | number | undefined): number {
  let parsedPort: number;
  if (typeof port === "string") {
    parsedPort = parseInt(port);
  } else if (typeof port === "number") {
    parsedPort = port;
  } else {
    parsedPort = 6379;
  }
  if (!Number.isSafeInteger(parsedPort)) {
    throw new Error("Port is invalid");
  }
  return parsedPort;
}
