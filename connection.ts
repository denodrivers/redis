import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import {
  CommandExecutor,
  CommandFunc,
  RedisRawReply,
  muxExecutor,
  sendCommand,
} from "./io.ts";

// type Reader = Deno.Reader;
// type Writer = Deno.Writer;
type Closer = Deno.Closer;

export type RedisConnectionOptions = {
  hostname?: string;
  port?: number | string;
  tls?: boolean;
  db?: number;
  password?: string;
  name?: string;
  maxRetryCount?: number;
};

export class RedisConnection {
  name: string | null = null;
  closer: Closer | null = null;
  reader: BufReader | null = null;
  writer: BufWriter | null = null;

  executor: CommandExecutor | null = null;

  get exec(): CommandFunc<RedisRawReply> {
    return this.executor!.exec;
  }

  private _isConnected = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  private _isClosed = false;

  get isClosed(): boolean {
    return this._isClosed;
  }

  maxRetryCount = 0;
  private retryCount = 0;

  private connectThunkified: () => Promise<RedisConnection>;
  private thunkifyConnect(
    hostname: string,
    port: string | number,
    options: RedisConnectionOptions,
  ): () => Promise<RedisConnection> {
    return async () => {
      const dialOpts: Deno.ConnectOptions = {
        hostname,
        port: parsePortLike(port),
      };
      if (!Number.isSafeInteger(dialOpts.port)) {
        throw new Error("deno-redis: opts.port is invalid");
      }
      const conn: Deno.Conn = options?.tls
        ? await Deno.connectTls(dialOpts)
        : await Deno.connect(dialOpts);

      if (options.name) this.name = options.name;
      if (options.maxRetryCount) this.maxRetryCount = options.maxRetryCount;

      this.closer = conn;
      this.reader = new BufReader(conn);
      this.writer = new BufWriter(conn);
      this.executor = muxExecutor(this, this.maxRetryCount > 0);

      this._isClosed = false;
      this._isConnected = true;

      try {
        if (options?.password != null) {
          await this.authenticate(options.password);
        }
        if (options?.db) await this.selectDb(options.db);
      } catch (error) {
        this.close();
        throw error;
      }

      return this as RedisConnection;
    };
  }

  constructor(
    hostname: string,
    port: number | string,
    private options: RedisConnectionOptions,
  ) {
    this.connectThunkified = this.thunkifyConnect(hostname, port, options);
  }

  private authenticate(
    password: string,
  ): Promise<RedisRawReply> {
    const readerAsBuffer = this.reader as BufReader;
    const writerAsBuffer = this.writer as BufWriter;

    return sendCommand(writerAsBuffer, readerAsBuffer, "AUTH", password);
  }

  private selectDb(
    databaseIndex: number | undefined = this.options.db,
  ): Promise<RedisRawReply> {
    if (!databaseIndex) throw new Error("The database index is undefined.");

    const readerAsBuffer = this.reader as BufReader;
    const writerAsBuffer = this.writer as BufWriter;

    return sendCommand(writerAsBuffer, readerAsBuffer, "SELECT", databaseIndex);
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

  /**
   * Connect to Redis server
   */
  async connect(): Promise<RedisConnection> {
    return this.connectThunkified();
  }

  async reconnect(): Promise<RedisConnection> {
    const readerAsBuffer = this.reader as BufReader;
    const writerAsBuffer = this.writer as BufWriter;
    if (!readerAsBuffer.peek(1)) throw new Error("Client is closed.");

    try {
      await sendCommand(writerAsBuffer, readerAsBuffer, "PING");
      this._isConnected = true;

      return Promise.resolve(this);
    } catch (error) {
      this._isConnected = false;
      return new Promise(
        (resolve, reject) => {
          const interval = setInterval(
            async () => {
              if (this.retryCount > this.maxRetryCount) {
                await this.close();
                clearInterval(interval);
                reject(new Error("Could not reconnect"));
              }

              try {
                await this.close();
                await this.connect();

                await sendCommand(
                  this.writer as BufWriter,
                  this.reader as BufReader,
                  "PING",
                );

                this._isConnected = true;
                this.retryCount = 0;
                clearInterval(interval);
                resolve(this);
              } catch (err) {
                // retrying
              } finally {
                this.retryCount++;
              }
            },
            1200,
          );
        },
      );
    }
  }
}

function parsePortLike(port: string | number | undefined): number {
  if (typeof port === "string") {
    return parseInt(port);
  } else if (typeof port === "number") {
    return port;
  } else if (port === undefined) {
    return 6379;
  } else {
    throw new Error("port is invalid: typeof=" + typeof port);
  }
}
