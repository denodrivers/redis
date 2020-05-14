type Reader = Deno.Reader;
type Writer = Deno.Writer;
type Closer = Deno.Closer;
import {
  BufReader,
  BufWriter,
} from "./vendor/https/deno.land/std/io/bufio.ts";
import { psubscribe, RedisSubscription, subscribe } from "./pubsub.ts";
import {
  muxExecutor,
  CommandExecutor,
  RedisRawReply,
} from "./io.ts";
import { createRedisPipeline, RedisPipeline } from "./pipeline.ts";
import {
  RedisCommands,
  Status,
  Bulk,
  Integer,
  ConditionalArray,
  BulkString,
  Raw,
  BulkNil,
} from "./command.ts";

export type Redis = RedisCommands & {
  executor: CommandExecutor;
};

class RedisImpl implements RedisCommands {
  _isClosed = false;
  get isClosed() {
    return this._isClosed;
  }

  constructor(
    private closer: Closer,
    private writer: BufWriter,
    private reader: BufReader,
    readonly executor: CommandExecutor,
  ) {
  }

  async execStatusReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<Status> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as Status;
  }

  async execIntegerReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<Integer> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as number;
  }

  async execBulkReply<T extends Bulk = Bulk>(
    command: string,
    ...args: (string | number)[]
  ): Promise<T> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as T;
  }

  async execArrayReply<T extends Raw = Raw>(
    command: string,
    ...args: (string | number)[]
  ): Promise<T[]> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as T[];
  }

  async execIntegerOrNilReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<Integer | BulkNil> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as Integer | BulkNil;
  }

  async execStatusOrNilReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<Status | BulkNil> {
    const [_, reply] = await this.executor.exec(command, ...args);
    return reply as Status | BulkNil;
  }

  append(key: string, value: string | number) {
    return this.execIntegerReply("APPEND", key, value);
  }

  auth(password: string) {
    return this.execStatusReply("AUTH", password);
  }

  bgrewriteaof() {
    return this.execStatusReply("BGREWRITEAOF");
  }

  bgsave() {
    return this.execStatusReply("BGSAVE");
  }

  bitcount(key: string, start?: number, end?: number) {
    if (start != null && end != null) {
      return this.execIntegerReply("BITCOUNT", key, start, end);
    } else if (start != null) {
      return this.execIntegerReply("BITCOUNT", key, start);
    } else return this.execIntegerReply("BITCOUNT", key);
  }

  bitfield(key: string, opts?: {
    get?: { type: string; offset: number | string };
    set?: { type: string; offset: number | string; value: number };
    incrby?: { type: string; offset: number | string; increment: number };
    overflow?: "WRAP" | "SAT" | "FAIL";
  }) {
    const args: (number | string)[] = [key];
    if (opts?.get) {
      const { type, offset } = opts.get;
      args.push("GET", type, offset);
    }
    if (opts?.set) {
      const { type, offset, value } = opts.set;
      args.push("SET", type, offset, value);
    }
    if (opts?.incrby) {
      const { type, offset, increment } = opts.incrby;
      args.push("INCRBY", type, offset, increment);
    }
    if (opts?.overflow) {
      args.push("OVERFLOW", opts.overflow);
    }
    return this.execArrayReply("BITFIELD", ...args) as Promise<number[]>;
  }

  bitop(operation: string, destkey: string, ...keys: string[]) {
    return this.execIntegerReply("BITOP", operation, destkey, ...keys);
  }

  bitpos(key: string, bit: number, start?: number, end?: number) {
    if (start != null && end != null) {
      return this.execIntegerReply("BITPOS", key, bit, start, end);
    } else if (start != null) {
      return this.execIntegerReply("BITPOS", key, bit, start);
    } else {
      return this.execIntegerReply("BITPOS", key, bit);
    }
  }

  blpop(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply<Bulk>("BLPOP", keys, timeout);
    } else {
      return this.execArrayReply<Bulk>("BLPOP", ...keys, timeout);
    }
  }

  brpop(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply<Bulk>("BRPOP", keys, timeout);
    } else {
      return this.execArrayReply<Bulk>("BRPOP", ...keys, timeout);
    }
  }

  brpoplpush(source: string, destination: string, timeout: number) {
    return this.execBulkReply("BRPOPLPUSH", source, destination, timeout);
  }

  bzpopmin(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  bzpopmin(keys: string | string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply<Bulk>("BZPOPMIN", keys, timeout);
    } else {
      return this.execArrayReply<Bulk>("BZPOPMIN", ...keys, timeout);
    }
  }

  bzpopmax(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  bzpopmax(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply("BZPOPMAX", keys, timeout);
    } else {
      return this.execArrayReply("BZPOPMAX", ...keys, timeout);
    }
  }

  command() {
    return this.execArrayReply("COMMAND") as Promise<
      [BulkString, Integer, BulkString[], Integer, Integer, Integer]
    >;
  }

  command_count() {
    return this.execIntegerReply("COMMAND", "COUNT");
  }

  command_getkeys() {
    return this.execArrayReply<BulkString>("COMMAND", "GETKEYS");
  }

  command_info(...command_names: string[]) {
    return this.execArrayReply("COMMAND", "INFO", ...command_names) as Promise<
      [
        [
          BulkString,
          Integer,
          BulkString[],
          Integer,
          Integer,
          Integer,
          [BulkString[]],
        ] | BulkNil,
      ]
    >;
  }

  config_get(parameter: string) {
    return this.execArrayReply<BulkString>("CONFIG", "GET", parameter);
  }

  config_rewrite() {
    return this.execStatusReply("CONFIG", "REWRITE");
  }

  config_set(parameter: string, value: string | number) {
    return this.execStatusReply("CONFIG", "SET", parameter, value);
  }

  config_resetstat() {
    return this.execStatusReply("CONFIG", "RESETSTAT");
  }

  dbsize() {
    return this.execIntegerReply("DBSIZE");
  }

  debug_object(key: string) {
    return this.execStatusReply("DEBUG", "OBJECT", key);
  }

  debug_segfault() {
    return this.execStatusReply("DEBUG", "SEGFAULT");
  }

  decr(key: string) {
    return this.execIntegerReply("DECR", key);
  }

  decrby(key: string, decrement: number) {
    return this.execIntegerReply("DECRBY", key, decrement);
  }

  del(key: string, ...keys: string[]) {
    return this.execIntegerReply("DEL", key, ...keys);
  }

  discard() {
    return this.execStatusReply("DISCARD");
  }

  dump(key: string) {
    return this.execBulkReply("DUMP", key);
  }

  echo(message: string) {
    return this.execBulkReply<BulkString>("ECHO", message);
  }

  eval(
    script: string,
    numkeys: number,
    keys: string | string[],
    arg: string | string[],
  ) {
    return this.doEval("EVAL", script, numkeys, keys, arg);
  }

  evalsha(
    sha1: string,
    numkeys: number,
    keys: string | string[],
    args: string | string[],
  ) {
    return this.doEval("EVALSHA", sha1, numkeys, keys, args);
  }

  private async doEval(
    cmd: string,
    script: string,
    numkeys: number,
    keys: string | string[],
    args: string | string[],
  ) {
    const _args = [script, numkeys];
    if (typeof keys === "string") {
      _args.push(keys);
    } else {
      _args.push(...keys);
    }
    if (typeof args === "string") {
      _args.push(args);
    } else {
      _args.push(...args);
    }
    const [_, raw] = await this.executor.exec(cmd, ..._args);
    return raw;
  }

  exec() {
    return this.execArrayReply("EXEC");
  }

  exists(...keys: string[]) {
    return this.execIntegerReply("EXISTS", ...keys);
  }

  expire(key: string, seconds: number) {
    return this.execIntegerReply("EXPIRE", key, seconds);
  }

  expireat(key: string, timestamp: string) {
    return this.execIntegerReply("EXPIREAT", key, timestamp);
  }

  flushall(async: boolean) {
    const args = async ? ["ASYNC"] : [];
    return this.execStatusReply("FLUSHALL", ...args);
  }

  flushdb(async: boolean) {
    const args = async ? ["ASYNC"] : [];
    return this.execStatusReply("FLUSHDB", ...args);
  }

  geoadd(key: string, ...args: any[]) {
    const _args = [];
    if (Array.isArray(args[0])) {
      for (const triple of args) {
        _args.push(...triple);
      }
    } else {
      _args.push(...args);
    }
    return this.execIntegerReply("GEOADD", key, ..._args);
  }

  geohash(key: string, ...members: string[]) {
    return this.execArrayReply<Bulk>("GEOHASH", key, ...members);
  }

  geopos(key: string, ...members: string[]) {
    return this.execArrayReply<[number, number] | undefined>(
      "GEOPOS",
      key,
      ...members,
    );
  }

  geodist(key: string, member1: string, member2: string, unit?: string) {
    if (unit) {
      return this.execBulkReply("GEODIST", key, member1, member2, unit);
    } else {
      return this.execBulkReply("GEODIST", key, member1, member2);
    }
  }

  georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: string,
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    },
  ) {
    const args = this.pushGeoRadiusOpts(
      [key, longitude, latitude, radius, unit],
      opts,
    );
    return this.execArrayReply("GEORADIUS", ...args);
  }

  georadiusbymember(
    key: string,
    member: string,
    radius: number,
    unit: string,
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    },
  ) {
    const args = this.pushGeoRadiusOpts([key, member, radius, unit], opts);
    return this.execArrayReply("GEORADIUSBYMEMBER", ...args);
  }

  private pushGeoRadiusOpts(
    args: (string | number)[],
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    },
  ) {
    if (!opts) return args;
    if (opts.withCoord) {
      args.push("WITHCOORD");
    }
    if (opts.withDist) {
      args.push("WITHDIST");
    }
    if (opts.withHash) {
      args.push("WITHHASH");
    }
    if (typeof opts.count === "number") {
      args.push(opts.count);
    }
    if (opts.sort === "ASC" || opts.sort === "DESC") {
      args.push(opts.sort);
    }
    if (typeof opts.store === "string") {
      args.push(opts.store);
    }
    if (typeof opts.storeDist === "string") {
      args.push(opts.storeDist);
    }
    return args;
  }

  get(key: string) {
    return this.execBulkReply("GET", key);
  }

  getbit(key: string, offset: number) {
    return this.execIntegerReply("GETBIT", key, offset);
  }

  getrange(key: string, start: number, end: number) {
    return this.execBulkReply<BulkString>("GETRANGE", key, start, end);
  }

  getset(key: string, value: string) {
    return this.execBulkReply("GETSET", key, value);
  }

  hdel(key: string, field: string, ...fields: string[]) {
    return this.execIntegerReply("HDEL", key, field, ...fields);
  }

  hexists(key: string, field: string) {
    return this.execIntegerReply("HEXISTS", key, field);
  }

  hget(key: string, field: string) {
    return this.execBulkReply("HGET", key, field);
  }

  hgetall(key: string) {
    return this.execArrayReply("HGETALL", key) as Promise<BulkString[]>;
  }

  hincrby(key: string, field: string, increment: number) {
    return this.execIntegerReply("HINCRBY", key, field, increment);
  }

  hincrbyfloat(key: string, field: string, increment: number) {
    return this.execBulkReply<BulkString>(
      "HINCRBYFLOAT",
      key,
      field,
      increment,
    );
  }

  hkeys(key: string) {
    return this.execArrayReply<BulkString>("HKEYS", key);
  }

  hlen(key: string) {
    return this.execIntegerReply("HLEN", key);
  }

  hmget(key: string, ...fields: string[]) {
    return this.execArrayReply<BulkString>("HMGET", key, ...fields);
  }

  hmset(key: string, ...field_values: string[]) {
    return this.execStatusReply("HMSET", key, ...field_values);
  }

  hset(key: string, ...args: string[]) {
    return this.execIntegerReply("HSET", key, ...args);
  }

  hsetnx(key: string, field: string, value: string) {
    return this.execIntegerReply("HSETNX", key, field, value);
  }

  hstrlen(key: string, field: string) {
    return this.execIntegerReply("HSTRLEN", key, field);
  }

  hvals(key: string) {
    return this.execArrayReply("HVALS", key) as Promise<BulkString[]>;
  }

  incr(key: string) {
    return this.execIntegerReply("INCR", key);
  }

  incrby(key: string, increment: number) {
    return this.execIntegerReply("INCRBY", key, increment);
  }

  incrbyfloat(key: string, increment: number) {
    return this.execBulkReply("INCRBYFLOAT", key, increment);
  }

  info(section?: string) {
    if (section) {
      return this.execStatusReply("INFO", section);
    } else {
      return this.execStatusReply("INFO");
    }
  }

  keys(pattern: string) {
    return this.execArrayReply<BulkString>("KEYS", pattern);
  }

  lastsave() {
    return this.execIntegerReply("LASTSAVE");
  }

  lindex(key: string, index: number) {
    return this.execBulkReply("LINDEX", key, index);
  }

  linsert(key: string, loc: "BEFORE" | "AFTER", pivot: string, value: string) {
    return this.execIntegerReply("LINSERT", key, loc, pivot, value);
  }

  llen(key: string) {
    return this.execIntegerReply("LLEN", key);
  }

  lpop(key: string) {
    return this.execBulkReply("LPOP", key);
  }

  lpush(key: string, ...values: (string | number)[]) {
    return this.execIntegerReply("LPUSH", key, ...values);
  }

  lpushx(key: string, value: string | number) {
    return this.execIntegerReply("LPUSHX", key, value);
  }

  lrange(key: string, start: number, stop: number) {
    return this.execArrayReply<BulkString>("LRANGE", key, start, stop);
  }

  lrem(key: string, count: number, value: string | number) {
    return this.execIntegerReply("LREM", key, count, value);
  }

  lset(key: string, index: number, value: string | number) {
    return this.execStatusReply("LSET", key, index, value);
  }

  ltrim(key: string, start: number, stop: number) {
    return this.execStatusReply("LTRIM", key, start, stop);
  }

  memory_doctor() {
    return this.execStatusReply("MEMORY", "DOCTOR");
  }

  memory_help() {
    return this.execArrayReply<BulkString>("MEMORY", "HELP");
  }

  memory_malloc_stats() {
    return this.execStatusReply("MEMORY", "MALLOC", "STATS");
  }

  memory_purge() {
    return this.execStatusReply("MEMORY", "PURGE");
  }

  memory_stats() {
    return this.execArrayReply<ConditionalArray>("MEMORY", "STATS");
  }

  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    },
  ) {
    const args: (number | string)[] = [key];
    if (opts && typeof opts.samples === "number") {
      args.push("SAMPLES", opts.samples);
    }
    return this.execIntegerReply("MEMORY", "USAGE", ...args);
  }

  mget(...keys: string[]) {
    return this.execArrayReply<Bulk>("MGET", ...keys);
  }

  migrate(
    host: string,
    port: number | string,
    key: string,
    destination_db: string,
    timeout: number,
    opts?: {
      copy?: boolean;
      replace?: boolean;
      keys?: string[];
    },
  ) {
    const args = [host, port, key, destination_db, timeout];
    if (opts) {
      if (opts.copy) {
        args.push("COPY");
      }
      if (opts.replace) {
        args.push("REPLACE");
      }
      if (opts.keys) {
        args.push("KEYS", ...opts.keys);
      }
    }
    return this.execStatusReply("MIGRATE", ...args);
  }

  monitor() {
    throw new Error("not supported yet");
  }

  move(key: string, db: string) {
    return this.execIntegerReply("MOVE", key, db);
  }

  mset(...key_values: string[]) {
    return this.execStatusReply("MSET", ...key_values);
  }

  msetnx(...key_values: string[]) {
    return this.execIntegerReply("MSETNX", ...key_values);
  }

  multi() {
    return this.execStatusReply("MULTI");
  }

  object_encoding(key: string) {
    return this.execBulkReply("OBJECT", "ENCODING", key);
  }

  object_freq(key: string) {
    return this.execIntegerReply("OBJECT", "FREQ", key);
  }

  object_help() {
    return this.execArrayReply<BulkString>("OBJECT", "HELP");
  }

  object_ideltime(key: string) {
    return this.execIntegerReply("OBJECT", "IDLETIME", key);
  }

  object_refcount(key: string) {
    return this.execIntegerReply("OBJECT", "REFCOUNT", key);
  }

  persist(key: string) {
    return this.execIntegerReply("PERSIST", key);
  }

  pexpire(key: string, milliseconds: number) {
    return this.execIntegerReply("PEXPIRE", key, milliseconds);
  }

  pexpireat(key: string, milliseconds_timestamp: number) {
    return this.execIntegerReply("PEXPIREAT", key, milliseconds_timestamp);
  }

  pfadd(key: string, element: string, ...elements: string[]) {
    return this.execIntegerReply("PFADD", key, element, ...elements);
  }

  pfcount(key: string, ...keys: string[]) {
    return this.execIntegerReply("PFCOUNT", key, ...keys);
  }

  pfmerge(destkey: string, ...sourcekeys: string[]) {
    return this.execStatusReply("PFMERGE", destkey, ...sourcekeys);
  }

  ping(message?: string) {
    if (message) {
      return this.execBulkReply<BulkString>("PING", message);
    } else {
      return this.execStatusReply("PING");
    }
  }

  psetex(key: string, milliseconds: number, value: string) {
    return this.execStatusReply("PSETEX", key, milliseconds, value);
  }

  // PubSub

  publish(channel: string, message: string) {
    return this.execIntegerReply("PUBLISH", channel, message);
  }

  subscribe(...channels: string[]) {
    return subscribe(this.writer, this.reader, ...channels);
  }

  psubscribe(...patterns: string[]) {
    return psubscribe(this.writer, this.reader, ...patterns);
  }

  pubsub_channels(pattern: string) {
    return this.execArrayReply<BulkString>("PUBSUB", "CHANNELS", pattern);
  }

  pubsub_numpat() {
    return this.execIntegerReply("PUBSUB", "NUMPAT");
  }

  async pubsub_numsubs(...channels: string[]) {
    const arr = await this.execArrayReply<BulkString | Integer>(
      "PUBSUB",
      "NUMSUBS",
      ...channels,
    );
    const ret: [string, number][] = [];
    for (let i = 0; i < arr.length; i += 2) {
      const [chan, num] = [arr[i] as BulkString, arr[i + 1] as Integer];
      ret.push([chan, num]);
    }
    return ret;
  }

  pttl(key: string) {
    return this.execIntegerReply("PTTL", key);
  }

  quit() {
    try {
      return this.execStatusReply("QUIT");
    } finally {
      this._isClosed = true;
    }
  }

  randomkey() {
    return this.execStatusReply("RANDOMKEY");
  }

  readonly() {
    return this.execStatusReply("READONLY");
  }

  readwrite() {
    return this.execStatusReply("READWRITE");
  }

  rename(key: string, newkey: string) {
    return this.execStatusReply("RENAME", key, newkey);
  }

  renamenx(key: string, newkey: string) {
    return this.execIntegerReply("RENAMENX", key, newkey);
  }

  restore(
    key: string,
    ttl: number,
    serialized_value: string,
    REPLACE?: boolean,
  ) {
    const args = [key, ttl, serialized_value];
    if (REPLACE) {
      args.push("REPLACE");
    }
    return this.execStatusReply("RESTORE", ...args);
  }

  role() {
    return this.execArrayReply("ROLE") as Promise<
      | ["master", Integer, BulkString[][]]
      | ["slave", BulkString, Integer, BulkString, Integer]
      | ["sentinel", BulkString[]]
    >;
  }

  rpop(key: string) {
    return this.execBulkReply("RPOP", key);
  }

  rpoplpush(source: string, destination: string) {
    return this.execBulkReply("RPOPLPUSH", source, destination);
  }

  rpush(key: string, ...values: (string | number)[]) {
    return this.execIntegerReply("RPUSH", key, ...values);
  }

  rpushx(key: string, value: string) {
    return this.execIntegerReply("RPUSHX", key, value);
  }

  sadd(key: string, member: string, ...members: string[]) {
    return this.execIntegerReply("SADD", key, member, ...members);
  }

  save() {
    return this.execStatusReply("SAVE");
  }

  scard(key: string) {
    return this.execIntegerReply("SCARD", key);
  }

  script_debug(arg: "YES" | "SYNC" | "NO") {
    return this.execStatusReply("SCRIPT", "DEBUG", arg);
  }

  script_exists(...sha1s: string[]) {
    return this.execArrayReply<Integer>("SCRIPT", "EXISTS", ...sha1s);
  }

  script_flush() {
    return this.execStatusReply("SCRIPT", "FLUSH");
  }

  script_kill() {
    return this.execStatusReply("SCRIPT", "KILL");
  }

  script_load(script: string) {
    return this.execStatusReply("SCRIPT", "LOAD", script);
  }

  sdiff(...keys: string[]) {
    return this.execArrayReply<BulkString>("SDIFF", ...keys);
  }

  sdiffstore(destination: string, key: string, ...keys: string[]) {
    return this.execIntegerReply("SDIFFSTORE", destination, key, ...keys);
  }

  select(index: number) {
    return this.execStatusReply("SELECT", index);
  }

  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
    },
  ): Promise<Status>;
  set(
    key: string,
    value: string,
    opts: {
      ex?: number;
      px?: number;
      mode: "NX" | "XX";
    },
  ): Promise<Status | BulkNil>;
  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
      mode?: "NX" | "XX";
    },
  ) {
    const args: (number | string)[] = [key, value];
    if (opts) {
      if (opts.ex) {
        args.push("EX", opts.ex);
      } else if (opts.px) {
        args.push("PX", opts.px);
      }
      if (opts.mode) {
        args.push(opts.mode);
      }
    }
    if (opts?.mode) {
      return this.execStatusOrNilReply("SET", ...args);
    } else {
      return this.execStatusReply("SET", ...args);
    }
  }

  setbit(key: string, offset: number, value: string) {
    return this.execIntegerReply("SETBIT", key, offset, value);
  }

  setex(key: string, seconds: number, value: string) {
    return this.execStatusReply("SETEX", key, seconds, value);
  }

  setnx(key: string, value: string) {
    return this.execIntegerReply("SETNX", key, value);
  }

  setrange(key: string, offset: number, value: string) {
    return this.execIntegerReply("SETRANGE", key, offset, value);
  }

  shutdown(arg: string) {
    return this.execStatusReply("SHUTDOWN", arg);
  }

  sinter(key: string, ...keys: string[]) {
    return this.execArrayReply<BulkString>("SINTER", key, ...keys);
  }

  sinterstore(destination: string, key: string, ...keys: string[]) {
    return this.execIntegerReply("SINTERSTORE", destination, key, ...keys);
  }

  sismember(key: string, member: string) {
    return this.execIntegerReply("SISMEMBER", key, member);
  }

  slaveof(host: string, port: string | number) {
    return this.execStatusReply("SLAVEOF", host, port);
  }

  replicaof(host: string, port: string | number) {
    return this.execStatusReply("REPLICAOF", host, port);
  }

  slowlog(subcommand: string, ...argument: string[]) {
    return this.executor.exec("SLOWLOG", subcommand, ...argument);
  }

  smembers(key: string) {
    return this.execArrayReply<BulkString>("SMEMBERS", key);
  }

  smove(source: string, destination: string, member: string) {
    return this.execIntegerReply("SMOVE", source, destination, member);
  }

  sort(
    key: string,
    opts?: {
      by?: string;
      offset?: number;
      count?: number;
      patterns?: string[];
      order: "ASC" | "DESC";
      alpha?: boolean;
    },
  ): Promise<BulkString[]>;

  sort(
    key: string,
    opts?: {
      by?: string;
      offset?: number;
      count?: number;
      patterns?: string[];
      order: "ASC" | "DESC";
      alpha?: boolean;
      destination: string;
    },
  ): Promise<Integer>;
  sort(
    key: string,
    opts?: {
      by?: string;
      offset?: number;
      count?: number;
      patterns?: string[];
      order: "ASC" | "DESC";
      alpha?: boolean;
      destination?: string;
    },
  ) {
    const args: (number | string)[] = [key];
    if (opts) {
      if (opts.by) {
        args.push("BY", opts.by);
      }
      if (opts.offset !== void 0 && opts.count !== void 0) {
        args.push("LIMIT", opts.offset, opts.count);
      }
      if (opts.patterns) {
        for (const pat of opts.patterns) {
          args.push("GET", pat);
        }
      }
      if (opts.alpha) {
        args.push("ALPHA");
      }
      if (opts.order) {
        args.push(opts.order);
      }
      if (opts.destination) {
        args.push("STORE", opts.destination);
      }
    }
    if (opts && opts.destination) {
      return this.execIntegerReply("SORT", ...args);
    } else {
      return this.execArrayReply("SORT", ...args);
    }
  }

  spop(key: string): Promise<Bulk>;
  spop(key: string, count: number): Promise<BulkString[]>;
  spop(key: string, count?: number) {
    if (typeof count === "number") {
      return this.execArrayReply<BulkString>("SPOP", key, count);
    } else {
      return this.execBulkReply("SPOP", key);
    }
  }

  srandmember(key: string): Promise<Bulk>;
  srandmember(key: string, count: number): Promise<BulkString[]>;
  srandmember(key: string, count?: number) {
    if (count != null) {
      return this.execArrayReply<BulkString>("SRANDMEMBER", key, count);
    } else {
      return this.execBulkReply("SRANDMEMBER", key);
    }
  }

  srem(key: string, ...members: string[]) {
    return this.execIntegerReply("SREM", key, ...members);
  }

  strlen(key: string) {
    return this.execIntegerReply("STRLEN", key);
  }

  sunion(...keys: string[]) {
    return this.execArrayReply<BulkString>("SUNION", ...keys);
  }

  sunionstore(destination: string, ...keys: string[]) {
    return this.execIntegerReply("SUNIONSTORE", destination, ...keys);
  }

  swapdb(index: number, index2: number) {
    return this.execStatusReply("SWAPDB", index, index2);
  }

  sync() {
    throw new Error("not implemented");
  }

  time() {
    return this.execArrayReply("TIME") as Promise<[BulkString, BulkString]>;
  }

  touch(...keys: string[]) {
    return this.execIntegerReply("TOUCH", ...keys);
  }

  ttl(key: string) {
    return this.execIntegerReply("TTL", key);
  }

  type(key: string) {
    return this.execStatusReply("TYPE", key);
  }

  unlink(...keys: string[]) {
    return this.execIntegerReply("UNLINK", ...keys);
  }

  unwatch() {
    return this.execStatusReply("UNWATCH");
  }

  wait(numreplicas: number, timeout: number) {
    return this.execIntegerReply("WAIT", numreplicas, timeout);
  }

  watch(key: string, ...keys: string[]) {
    return this.execStatusReply("WATCH", key, ...keys);
  }

  zadd(key: string, scoreOrArr: any, memberOrOpts: any, opts?: any) {
    const args: (string | number)[] = [key];
    let _opts = opts;
    if (typeof scoreOrArr === "number") {
      args.push(scoreOrArr);
      args.push(memberOrOpts);
    } else if (Array.isArray(scoreOrArr)) {
      for (const [s, m] of scoreOrArr) {
        args.push(s, m);
      }
      _opts = memberOrOpts;
    }
    if (_opts) {
      if (_opts.nxx) {
        args.push(_opts.nxx);
      }
      if (_opts.ch) {
        args.push("CH");
      }
      if (_opts.incr) {
        args.push("INCR");
      }
    }
    return this.execIntegerReply("ZADD", ...args);
  }

  zcard(key: string) {
    return this.execIntegerReply("ZCARD", key);
  }

  zcount(key: string, min: number, max: number) {
    return this.execIntegerReply("ZCOUNT", key, min, max);
  }

  zincrby(key: string, increment: number, member: string) {
    return this.execBulkReply<BulkString>("ZINCRBY", key, increment, member);
  }

  zinterstore(
    destination: string,
    numkeys: number,
    keys: string[],
    weights?: number | number[],
    aggregate?: string,
  ) {
    const args = this.pushZInterStoreArgs(
      [destination, numkeys],
      keys,
      weights,
      aggregate,
    );
    return this.execIntegerReply("ZINTERSTORE", ...args);
  }

  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    },
  ) {
    const args: (string | number)[] = [destination, keys.length, ...keys];
    if (opts) {
      if (opts.weights) {
        args.push("WEIGHTS", ...opts.weights);
      }
      if (opts.aggregate) {
        args.push("AGGREGATE", opts.aggregate);
      }
    }
    return this.execIntegerReply("ZUNIONSTORE", ...args);
  }

  private pushZInterStoreArgs(
    args: (number | string)[],
    keys: string | string[],
    weights?: number | number[],
    aggregate?: string,
  ) {
    if (typeof keys === "string") {
      args.push(keys);
    } else {
      args.push(...keys);
    }
    if (weights) {
      args.push("WEIGHTS");
      if (typeof weights === "number") {
        args.push(weights);
      } else {
        args.push(...weights);
      }
    }
    if (aggregate) {
      args.push("AGGREGATE");
      args.push(aggregate);
    }
    return args;
  }

  zlexcount(key: string, min: string, max: string) {
    return this.execIntegerReply("ZLEXCOUNT", key, min, max);
  }

  zpopmax(key: string, count?: number) {
    if (count != null) {
      return this.execArrayReply<BulkString>("ZPOPMAX", key, count);
    } else {
      return this.execArrayReply<BulkString>("ZPOPMAX", key);
    }
  }

  zpopmin(key: string, count?: number) {
    if (count != null) {
      return this.execArrayReply<BulkString>("ZPOPMIN", key, count);
    } else {
      return this.execArrayReply<BulkString>("ZPOPMIN", key);
    }
  }

  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply<BulkString>("ZRANGE", ...args);
  }

  zrangebylex(
    key: string,
    min: string,
    max: string,
    opts?: {
      withScore?: boolean;
      count?: number;
    },
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZRANGEBYLEX", ...args);
  }

  zrevrangebylex(
    key: string,
    max: string,
    min: string,
    opts?: {
      withScore?: boolean;
      count?: number;
    },
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZREVRANGEBYLEX", ...args);
  }

  zrangebyscore(
    key: string,
    min: string,
    max: string,
    opts?: {
      withScore?: boolean;
      count?: number;
    },
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZRANGEBYSCORE", ...args);
  }

  private pushZrangeOpts(
    args: (number | string)[],
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ) {
    if (opts) {
      if (opts.withScore) {
        args.push("WITHSCORES");
      }
      if (opts.offset !== void 0 && opts.count !== void 0) {
        args.push("LIMIT", opts.offset, opts.count);
      }
    }
    return args;
  }

  zrank(key: string, member: string) {
    return this.execIntegerReply("ZRANK", key, member);
  }

  zrem(key: string, ...members: string[]) {
    return this.execIntegerReply("ZREM", key, ...members);
  }

  zremrangebylex(key: string, min: string, max: string) {
    return this.execIntegerReply("ZREMRANGEBYLEX", key, min, max);
  }

  zremrangebyrank(key: string, start: number, stop: number) {
    return this.execIntegerReply("ZREMRANGEBYRANK", key, start, stop);
  }

  zremrangebyscore(key: string, min: number, max: number) {
    return this.execIntegerReply("ZREMRANGEBYSCORE", key, min, max);
  }

  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply<BulkString>("ZREVRANGE", ...args);
  }

  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ) {
    const args = this.pushZrangeOpts([key, max, min], opts);
    return this.execArrayReply<BulkString>("ZREVRANGEBYSCORE", ...args);
  }

  zrevrank(key: string, member: string) {
    return this.execIntegerReply("ZREVRANK", key, member);
  }

  zscore(key: string, member: string) {
    return this.execBulkReply("ZSCORE", key, member);
  }

  scan(
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ) {
    const arg = this.pushScanOpts([cursor], opts);
    return this.execArrayReply("SCAN", ...arg) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("SSCAN", ...arg) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("HSCAN", ...arg) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    },
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("ZSCAN", ...arg) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  private pushScanOpts(
    arg: (number | string)[],
    opts?: {
      pattern?: string;
      count?: number;
    },
  ) {
    if (opts) {
      if (opts.pattern) {
        arg.push("MATCH", opts.pattern);
      }
      if (opts.count !== void 0) {
        arg.push("COUNT", opts.count);
      }
    }
    return arg;
  }

  // pipeline
  tx() {
    return createRedisPipeline(this.writer, this.reader, { tx: true });
  }

  pipeline() {
    return createRedisPipeline(this.writer, this.reader);
  }

  // Stream

  close() {
    this.closer.close();
  }
}

export type RedisConnectOptions = {
  hostname: string;
  port?: number | string;
  tls?: boolean;
  db?: number;
};

function prasePortLike(port: string | number | undefined): number {
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

/**
 * Connect to Redis server
 * @param opts redis server's url http/https url with port number
 * Examples:
 *  const conn = connect({hostname: "127.0.0.1", port: 6379})// -> tcp, 127.0.0.1:6379
 *  const conn = connect({hostname: "redis.proxy", port: 443, tls: true}) // -> TLS, redis.proxy:443
 */
export async function connect({
  hostname,
  port,
  tls,
  db,
}: RedisConnectOptions): Promise<Redis> {
  const dialOpts: Deno.ConnectOptions = {
    hostname,
    port: prasePortLike(port),
  };
  if (!Number.isSafeInteger(dialOpts.port)) {
    throw new Error("deno-redis: opts.port is invalid");
  }
  const conn: Deno.Conn = tls
    ? await Deno.connectTls(dialOpts)
    : await Deno.connect(dialOpts);

  const bufr = new BufReader(conn);
  const bufw = new BufWriter(conn);
  const exec = muxExecutor(bufr, bufw);
  const client = await create(conn, conn, conn, exec);
  if (db) {
    await client.select(db);
  }
  return client;
}

export function create(
  closer: Closer,
  writer: Writer,
  reader: Reader,
  executor: CommandExecutor,
): Redis {
  return new RedisImpl(
    closer,
    new BufWriter(writer),
    new BufReader(reader),
    executor,
  );
}
