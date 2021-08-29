import { RedisCommand, RedisReply, RedisReplyOrError, RedisValue, readReply, sendCommand, sendCommands } from "./protocol/mod.ts";
import { EOFError } from "./errors.ts";
import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import {
  Deferred,
  deferred,
} from "./vendor/https/deno.land/std/async/deferred.ts";

const kDefaultRetryInterval = 1200;
const kDefaultMaxRetryCount = 0;

/**
 * Low level Redis client
 */
export interface Client {
  /**
   * Execute `command` with the given `args`.
   */
  exec(
    command: string,
    ...args: RedisValue[]
  ): Promise<RedisReply>;

  execBatch(
    commands: Array<RedisCommand>,
  ): Promise<RedisReplyOrError[]>;

  /**
   * This method is intended for use in Pub/Sub etc.
   */
  readNextReply(): Promise<RedisReply>;

  /**
   * Establish a connection to the Redis Server.
   */
  connect(): Promise<void>;

  close(): void;
  reconnect(): Promise<void>;

  /**
   * @private
   */
  _forceRetry(): void;

  isClosed: boolean;
  isConnected: boolean;
  isRetriable: boolean;
}

export interface RedisConnectionOptions {
  tls?: boolean;
  db?: number;
  password?: string;
  maxRetryCount?: number;
  retryInterval?: number;
}

export function create(hostname: string, port: number | string, options: RedisConnectionOptions): Client {
  return new BasicClient(hostname, port, options ?? {});
}

export async function connect(
  hostname: string,
  port: number | string,
  options: RedisConnectionOptions,
): Promise<Client> {
  const client = create(hostname, port, options);
  await client.connect();
  return client;
}

class BasicClient implements Client {
  readonly #options: RedisConnectionOptions;
  readonly #hostname: string;
  readonly #port: number | string;
  #writer!: BufWriter;
  #reader!: BufReader;
  #closer!: Deno.Closer;

  #isConnected?: boolean;
  #isClosed?: boolean;
  #maxRetryCount: number;
  #retryInterval: number;


  #queue: {
    command: string;
    args: RedisValue[];
    d: Deferred<RedisReply>;
  }[] = [];

  constructor(
    hostname: string,
    port: number | string,
    options: RedisConnectionOptions) {
    this.#options = options;
    this.#hostname = hostname;
    this.#port = port;
    this.#maxRetryCount = options.maxRetryCount ?? kDefaultMaxRetryCount;
    this.#retryInterval = options.retryInterval ?? kDefaultRetryInterval;
  }

  get isClosed(): boolean {
    return this.#isClosed ?? true;
  }

  get isConnected(): boolean {
    return this.#isConnected ?? false;
  }

  get isRetriable(): boolean {
    return this.#maxRetryCount > 0;
  }

  async connect() {
    const options = this.#options;
    const dialOpts: Deno.ConnectOptions = {
      hostname: this.#hostname,
      port: parsePortLike(this.#port),
    };
    const conn: Deno.Conn = options?.tls
      ? await Deno.connectTls(dialOpts)
      : await Deno.connect(dialOpts);

    this.#closer = conn;
    this.#reader = new BufReader(conn);
    this.#writer = new BufWriter(conn);
    this.#isClosed = false;
    this.#isConnected = true;

    try {
      if (options?.password != null) {
        await this.#authenticate(options.password);
      }
      if (options?.db) {
        await this.#selectDb(options.db);
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  readNextReply(): Promise<RedisReply> {
    return readReply(this.#reader);
  }

  close() {
    this.#isClosed = true;
    this.#isConnected = false;
    try {
      this.#closer.close();
    } catch (error) {
      if (!(error instanceof Deno.errors.BadResource)) throw error;
    }
  }

  async reconnect(): Promise<void> {
    if (!this.#reader.peek(1)) {
      throw new Error("Client is closed.");
    }
    try {
      await sendCommand(this.#writer, this.#reader, "PING");
      this.#isConnected = true;
    } catch (_error) { // TODO: Maybe we should log this error.
      this.#isConnected = false;
      let retryCount = 0;
      return new Promise((resolve, reject) => {
        const _interval = setInterval(async () => {
          if (retryCount > this.#maxRetryCount) {
            this.close();
            clearInterval(_interval);
            reject(new Error("Could not reconnect"));
          }
          try {
            this.close();
            await this.connect();
            await sendCommand(this.#writer, this.#reader, "PING");
            this.#isConnected = true;
            clearInterval(_interval);
            resolve();
          } catch (_err) {
            // retrying
          } finally {
            retryCount++;
          }
        }, this.#retryInterval);
      });
    }
  }

  exec(command: string, ...args: RedisValue[]): Promise<RedisReply> {
    const d = deferred<RedisReply>();
    this.#queue.push({ command, args, d });
    if (this.#queue.length === 1) {
      this.#dequeue();
    }
    return d;
  }

  execBatch(
    commands: Array<RedisCommand>,
  ): Promise<RedisReplyOrError[]> {
    return sendCommands(this.#writer, this.#reader, commands);
  }

  #dequeue(): void {
    const [e] = this.#queue;
    if (!e) return;
    sendCommand(
      this.#writer,
      this.#reader,
      e.command,
      ...e.args,
    )
      .then(e.d.resolve)
      .catch(async (error) => {
        if (
          this.isRetriable &&
          // Error `BadResource` is thrown when an attempt is made to write to a closed connection,
          //  Make sure that the connection wasn't explicitly closed by the user before trying to reconnect.
          ((error instanceof Deno.errors.BadResource &&
            !this.#isClosed) ||
            error instanceof Deno.errors.BrokenPipe ||
            error instanceof Deno.errors.ConnectionAborted ||
            error instanceof Deno.errors.ConnectionRefused ||
            error instanceof Deno.errors.ConnectionReset ||
            error instanceof EOFError)
        ) {
          await this.reconnect();
        } else e.d.reject(error);
      })
      .finally(() => {
        this.#queue.shift();
        this.#dequeue();
      });
  }

  #authenticate(password: string): Promise<RedisReply> {
    return sendCommand(this.#writer, this.#reader, "AUTH", password);
  }

  #selectDb(
    db: number,
  ): Promise<RedisReply> {
    return sendCommand(this.#writer, this.#reader, "SELECT", db);
  }

  _forceRetry(): void {
    this.#maxRetryCount = 10; // TODO Adjust this.
  }
}

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
