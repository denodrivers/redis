type Reader = Deno.Reader;
type Writer = Deno.Writer;
type Closer = Deno.Closer;
import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import { yellow } from "./vendor/https/deno.land/std/fmt/colors.ts";
import { ConnectionClosedError } from "./errors.ts";
import { psubscribe, RedisSubscription, subscribe } from "./pubsub.ts";
import { RedisRawReply, sendCommand, BulkResult } from "./io.ts";
import { createRedisPipeline, RedisPipeline } from "./pipeline.ts";
import { deferred, Deferred } from "./vendor/https/deno.land/std/util/async.ts";
export type Redis = {
  // Connection
  auth(password: string): Promise<BulkResult>;
  echo(message: string): Promise<BulkResult>;
  ping(message?: string): Promise<string>;
  quit(): Promise<string>;
  select(index: number): Promise<string>;
  swapdb(index: number, index2: number): Promise<string>;
  // Keys
  del(...keys: string[]): Promise<number>;
  dump(key: string): Promise<string>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  expireat(key: string, timestamp: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
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
    }
  ): Promise<string>;
  move(key: string, db: string): Promise<number>;
  object_refcount(key: string): Promise<number>;
  object_encoding(key: string): Promise<number>;
  object_ideltime(key: string): Promise<number>;
  object_freq(key: string): Promise<BulkResult>;
  object_help(): Promise<BulkResult>;
  persist(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pexpireat(key: string, milliseconds_timestamp: number): Promise<number>;
  pttl(key: string): Promise<number>;
  randomkey(): Promise<string>;
  rename(key: string, newkey: string): Promise<string>;
  renamenx(key: string, newkey: string): Promise<number>;
  restore(
    key: string,
    ttl: number,
    serialized_value: string,
    replace?: boolean
  ): Promise<string>;
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
    }
  ): Promise<string[] | number>;
  touch(...keys: string[]): Promise<number>;
  ttl(key: string): Promise<number>;
  type(key: string): Promise<string>;
  unlink(...keys: string[]): Promise<number>;
  wait(numreplicas: number, timeout: number): Promise<number>;
  // String
  append(key: string, value: string): Promise<number>;
  bitcount(key: string): Promise<number>;
  bitcount(key: string, start: number, end: number): Promise<number>;
  bitfield(): Promise<string[]>;
  bitop(
    operation: "AND" | "OR" | "XOR" | "NOT",
    destkey: string,
    ...keys: string[]
  ): Promise<number>;
  bitpos(
    key: string,
    bit: number,
    start?: number,
    end?: number
  ): Promise<number>;
  decr(key: string): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  incrbyfloat(key: string, increment: number): Promise<string>;
  mget(...keys: string[]): Promise<string[]>;
  mset(key: string, value: string): Promise<string>;
  mset(...key_values: string[]): Promise<string>;
  msetnx(key: string, value: string): Promise<number>;
  msetnx(...key_values: string[]): Promise<number>;
  psetex(key: string, milliseconds: number, value: string): Promise<string>;
  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
      mode?: "NX" | "XX";
    }
  ): Promise<BulkResult>;
  setbit(key: string, offset: number, value: string): Promise<number>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  setnx(key: string, value: string): Promise<number>;
  setrange(key: string, offset: number, value: string): Promise<number>;
  strlen(key: string): Promise<number>;
  get(key: string): Promise<BulkResult>;
  getbit(key: string, offset: number): Promise<number>;
  getrange(key: string, start: number, end: number): Promise<string>;
  getset(key: string, value: string): Promise<string>;
  // Geo
  geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string
  ): Promise<number>;
  geoadd(
    key: string,
    ...longitude_latitude_member: [number | number | string][]
  ): Promise<number>;
  geohash(key: string, ...members: string[]): Promise<string[]>;
  geopos(key: string, ...members: string[]): Promise<string[]>;
  geodist(
    key: string,
    member1: string,
    member2: string,
    unit?: "m" | "km" | "ft" | "mi"
  ): Promise<string>;
  georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    }
  ): Promise<string[]>;
  georadiusbymember(
    key: string,
    member: string,
    radius: number,
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      storeDist?: string;
    }
  ): Promise<string[]>;
  // Hash
  hdel(key: string, ...fields: string[]): Promise<number>;
  hexists(key: string, field: string): Promise<number>;
  hget(key: string, field: string): Promise<string>;
  hgetall(key: string): Promise<string[]>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hincrbyfloat(key: string, field: string, increment: number): Promise<string>;
  hkeys(key: string): Promise<string[]>;
  hlen(key: string): Promise<number>;
  hmget(key: string, ...fields: string[]): Promise<string[]>;
  hmset(key: string, field: string, value: string): Promise<string>;
  hmset(key: string, ...field_values: string[]): Promise<string>;
  hset(key: string, field: string, value: string): Promise<number>;
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hstrlen(key: string, field: string): Promise<number>;
  hvals(key: string): Promise<string[]>;
  // List
  blpop(key: string | string[], timeout: number): Promise<string[]>;
  brpop(key: string | string[], timeout: number): Promise<string[]>;
  brpoplpush(
    source: string,
    destination: string,
    timeout: number
  ): Promise<string>;
  lindex(key: string, index: number): Promise<string>;
  linsert(
    key: string,
    loc: "BEFORE" | "AFTER",
    pivot: string,
    value: string
  ): Promise<number>;
  llen(key: string): Promise<number>;
  lpop(key: string): Promise<string>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lpushx(key: string, value: string): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lrem(key: string, count: number, value: string): Promise<number>;
  lset(key: string, index: number, value: string): Promise<string>;
  ltrim(key: string, start: number, stop: number): Promise<string>;
  rpop(key: string): Promise<string>;
  rpoplpush(source: string, destination: string): Promise<string>;
  rpush(key: string, ...values: string[]): Promise<number>;
  rpushx(key: string, value: string): Promise<number>;
  // HypeprLogLog
  pfadd(key: string, ...elements: string[]): Promise<number>;
  pfcount(...keys: string[]): Promise<number>;
  pfmerge(destkey: string, ...sourcekeys: string[]): Promise<string>;
  // PubSub
  publish(channel: string, message: string): Promise<number>;
  psubscribe(...patterns: string[]): Promise<RedisSubscription>;
  subscribe(...channels: string[]): Promise<RedisSubscription>;
  pubsub_channels(pattern: string): Promise<string[]>;
  pubsub_numsubs(...channels: string[]): Promise<string[]>;
  pubsub_numpat(): Promise<number>;
  // Cluster
  readonly(): Promise<string>;
  readwrite(): Promise<string>;
  // Set
  sadd(key: string, ...members: string[]): Promise<number>;
  scard(key: string): Promise<number>;
  sdiff(...keys: string[]): Promise<string[]>;
  sdiffstore(destination: string, ...keys: string[]): Promise<number>;
  sinter(...keys: string[]): Promise<string[]>;
  sinterstore(destination: string, ...keys: string[]): Promise<number>;
  sismember(key: string, member: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  smove(source: string, destination: string, member: string): Promise<number>;
  spop(key: string): Promise<string>;
  spop(key: string, count: number): Promise<string[]>;
  srandmember(key: string, count?: number): Promise<string>;
  srem(key: string, ...members: string[]): Promise<number>;
  sunion(...keys: string[]): Promise<string[]>;
  sunionstore(destination: string, ...keys: string[]): Promise<number>;
  // SortedSet
  bzpopmin(key: string | string[], timeout: number): Promise<string[]>;
  bzpopmax(key: string | string[], timeout: number): Promise<string[]>;
  zadd(
    key: string,
    score: number,
    member: string,
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): Promise<number>;
  zadd(
    key: string,
    score_members: (number | string)[],
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): Promise<number>;
  zcard(key: string): Promise<number>;
  zcount(key: string, min: number, max: number): Promise<number>;
  zincrby(key: string, increment: number, member: string): Promise<string>;
  zinterstore(
    destination: string,
    numkeys: number,
    keys: string | string[],
    weights?: number | number[],
    aggregate?: "SUM" | "MIN" | "MAX"
  ): Promise<number>;
  zlexcount(key: string, min: number, max: number): Promise<number>;
  zpopmax(key: string, count?: number): Promise<string[]>;
  zpopmin(key: string, count?: number): Promise<string[]>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): Promise<string[]>;
  zrangebylex(
    key: string,
    min: number,
    max: number,
    opts?: {
      offset?: number;
      count?: number;
    }
  ): Promise<string[]>;
  zrevrangebylex(
    key: string,
    max: number,
    min: number,
    opts?: {
      offset?: number;
      count?: number;
    }
  ): Promise<string[]>;
  zrangebyscore(
    key: string,
    min: number,
    max: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): Promise<string[]>;
  zrank(key: string, member: string): Promise<number | undefined>;
  zrem(key: string, ...members: string[]): Promise<number>;
  zremrangebylex(key: string, min: number, max: number): Promise<number>;
  zremrangebyrank(key: string, start: number, stop: number): Promise<number>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): Promise<string[]>;
  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    ops?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): Promise<string[]>;
  zrevrank(key: string, member: string): Promise<number | undefined>;
  zscore(key: string, member: string): Promise<string>;
  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    }
  ): Promise<number>;
  // Cluster
  // cluster //
  // Server
  bgrewriteaof(): Promise<BulkResult>;
  bgsave(): Promise<BulkResult>;
  // client //
  command(): Promise<string[]>;
  command_count(): Promise<number>;
  command_getkeys(): Promise<string[]>;
  command_info(...command_names: string[]): Promise<string[]>;
  config_get(parameter: string): Promise<string[]>;
  config_rewrite(): Promise<BulkResult>;
  config_set(parameter: string, value: string): Promise<BulkResult>;
  config_resetstat(): Promise<BulkResult>;
  dbsize(): Promise<number>;
  debug_object(key: string): Promise<BulkResult>;
  debug_segfault(): Promise<BulkResult>;
  flushall(async?: boolean): Promise<BulkResult>;
  flushdb(async?: boolean): Promise<BulkResult>;
  info(section?: string): Promise<string>;
  lastsave(): Promise<number>;
  memory_doctor(): Promise<string>;
  memory_help(): Promise<string[]>;
  memory_malloc_stats(): Promise<string>;
  memory_purge(): Promise<string>;
  memory_stats(): Promise<string[]>;
  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    }
  ): Promise<number>;
  monitor(): void;
  role(): Promise<string[]>;
  save(): Promise<string>;
  shutdown(arg: "NOSAVE" | "SAVE"): Promise<string>;
  slaveof(host: string, port: string | number): Promise<string>;
  replicaof(host: string, port: string | number): Promise<string>;
  slowlog(subcommand: string, ...argument: string[]): Promise<RedisRawReply>;
  sync(): void;
  time(): Promise<string[]>;
  // Scripting
  eval(script: string, key: string, arg: string): Promise<RedisRawReply>;
  eval(script: string, keys: string[], args: string[]): Promise<RedisRawReply>;
  evalsha(sha1: string, key: string, arg: string): Promise<RedisRawReply>;
  evalsha(sha1: string, keys: string[], args: string[]): Promise<RedisRawReply>;
  script_debug(arg: "YES" | "SYNC" | "NO"): Promise<string>;
  script_exists(...sha1s: string[]): Promise<string[]>;
  script_flush(): Promise<string>;
  script_kill(): Promise<string>;
  script_load(script: string): Promise<string>;
  // multi
  multi(): Promise<string>;
  exec(): Promise<any[]>;
  discard(): Promise<BulkResult>;
  watch(...keys: string[]): Promise<string>;
  unwatch(): Promise<string>;
  // pipeline
  tx(): RedisPipeline;
  pipeline(): RedisPipeline;
  // scan
  scan(
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ): Promise<string[]>;
  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ): Promise<string[]>;
  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ): Promise<string[]>;
  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    }
  ): Promise<string[]>;

  readonly isClosed: boolean;
  close(): void;
};

export interface CommandExecutor {
  execRawReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply>;
}

export function muxExecutor(r: BufReader, w: BufWriter): CommandExecutor {
  let queue: {
    command: string;
    args: (string | number)[];
    d: Deferred<RedisRawReply>;
  }[] = [];

  function dequeue(): void {
    const [e] = queue;
    if (!e) return;
    sendCommand(w, r, e.command, ...e.args)
      .then(v => e.d.resolve(v))
      .catch(err => e.d.reject(err))
      .finally(() => {
        queue.shift();
        dequeue();
      });
  }

  return {
    async execRawReply(
      command: string,
      ...args: (string | number)[]
    ): Promise<RedisRawReply> {
      const d = deferred<RedisRawReply>();
      queue.push({ command, args, d });
      if (queue.length === 1) {
        dequeue();
      }
      return d;
    }
  };
}

class RedisImpl implements Redis {
  _isClosed = false;
  get isClosed() {
    return this._isClosed;
  }

  private executor: CommandExecutor;
  constructor(
    private closer: Closer,
    private writer: BufWriter,
    private reader: BufReader,
    executor?: CommandExecutor
  ) {
    this.executor = executor || muxExecutor(reader, writer);
  }

  async execRawReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<RedisRawReply> {
    if (this.isClosed) throw new ConnectionClosedError();
    return sendCommand(this.writer, this.reader, command, ...args);
  }

  async execStatusReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<string> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    return reply as string;
  }

  async execIntegerReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<number> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    return reply as number;
  }

  async execBulkReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<BulkResult> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    // Note: `reply != null` won't work when `strict` is false #50
    if (typeof reply !== "string" && typeof reply !== "undefined") {
      throw new Error();
    }
    return reply;
  }

  async execArrayReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<any[]> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    return reply as any[];
  }

  append(key: string, value: string | number) {
    return this.execIntegerReply("APPEND", key, value);
  }

  auth(password: string) {
    return this.execBulkReply("AUTH", password);
  }

  bgrewriteaof() {
    return this.execBulkReply("BGREWRITEAOF");
  }

  bgsave() {
    return this.execBulkReply("BGSAVE");
  }

  bitcount(key: string, start?: number, end?: number) {
    if (start != null && end != null)
      return this.execIntegerReply("BITCOUNT", key, start, end);
    else if (start != null)
      return this.execIntegerReply("BITCOUNT", key, start);
    else return this.execIntegerReply("BITCOUNT", key);
  }

  bitfield() {
    return this.execArrayReply("BITFIELD");
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
      return this.execArrayReply("BLPOP", keys, timeout);
    } else {
      return this.execArrayReply("BLPOP", ...keys, timeout);
    }
  }

  brpop(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply("BRPOP", keys, timeout);
    } else {
      return this.execArrayReply("BRPOP", ...keys, timeout);
    }
  }

  brpoplpush(source: string, destination: string, timeout: number) {
    return this.execStatusReply("BRPOPLPUSH", source, destination, timeout);
  }

  bzpopmin(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply("BZPOPMIN", keys, timeout);
    } else {
      return this.execArrayReply("BZPOPMIN", ...keys, timeout);
    }
  }

  bzpopmax(keys: string[], timeout: number) {
    if (typeof keys === "string") {
      return this.execArrayReply("BZPOPMAX", keys, timeout);
    } else {
      return this.execArrayReply("BZPOPMAX", ...keys, timeout);
    }
  }

  command() {
    return this.execArrayReply("COMMAND");
  }

  command_count() {
    return this.execIntegerReply("COMMAND", "COUNT");
  }

  command_getkeys() {
    return this.execArrayReply("COMMAND", "GETKEYS");
  }

  command_info(...command_names: string[]) {
    return this.execArrayReply("COMMAND", "INFO", ...command_names);
  }

  config_get(parameter: string) {
    return this.execArrayReply("CONFIG", "GET", parameter);
  }

  config_rewrite() {
    return this.execBulkReply("CONFIG", "REWRITE");
  }

  config_set(parameter: string, value: string | number) {
    return this.execBulkReply("CONFIG", "SET", parameter, value);
  }

  config_resetstat() {
    return this.execBulkReply("CONFIG", "RESETSTAT");
  }

  dbsize() {
    return this.execIntegerReply("DBSIZE");
  }

  debug_object(key: string) {
    return this.execBulkReply("DEBUG", "OBJECT", key);
  }

  debug_segfault() {
    return this.execBulkReply("DEBUG", "SEGFAULT");
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
    return this.execBulkReply("DISCARD");
  }

  dump(key: string) {
    return this.execStatusReply("DUMP", key);
  }

  echo(message: string) {
    return this.execStatusReply("ECHO", message);
  }

  eval(script: string, keys: string | string[], arg: string | string[]) {
    return this.doEval("EVAL", script, keys, arg);
  }

  evalsha(sha1: string, keys: string | string[], args: string | string[]) {
    return this.doEval("EVALSHA", sha1, keys, args);
  }

  private doEval(
    cmd: string,
    script: string,
    keys: string | string[],
    args: string | string[]
  ) {
    const _args = [script];
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
    return this.execRawReply(cmd, ..._args);
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
    return this.execBulkReply("FLUSHALL", ...args);
  }

  flushdb(async: boolean) {
    const args = async ? ["ASYNC"] : [];
    return this.execBulkReply("FLUSHDB", ...args);
  }

  geoadd(key: string, ...args: any) {
    const _args = [key];
    if (Array.isArray([args[0]])) {
      for (const triple of args) {
        _args.push(...triple);
      }
    } else {
      _args.push(...args);
    }
    return this.execIntegerReply("GEOADD", key, ..._args);
  }

  geohash(key: string, ...members: string[]) {
    return this.execArrayReply("GEOHASH", key, ...members);
  }

  geopos(key: string, ...members: string[]) {
    return this.execArrayReply("GEOPOS", key, ...members);
  }

  geodist(key: string, member1: string, member2: string, unit?: string) {
    if (unit)
      return this.execStatusReply("GEODIST", key, member1, member2, unit);
    else return this.execStatusReply("GEODIST", key, member1, member2);
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
    }
  ) {
    const args = this.pushGeoRadiusOpts(
      [key, longitude, latitude, radius, unit],
      opts
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
    }
  ) {
    const args = this.pushGeoRadiusOpts([key, member, radius, unit], opts);
    return this.execArrayReply("GEORADIUSBYMEMBER", ...args);
  }

  private pushGeoRadiusOpts(
    args: (string | number)[],
    opts:
      | {
          withCoord?: boolean;
          withDist?: boolean;
          withHash?: boolean;
          count?: number;
          sort?: "ASC" | "DESC";
          store?: string;
          storeDist?: string;
        }
      | undefined
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
    return this.execStatusReply("GETRANGE", key, start, end);
  }

  getset(key: string, value: string) {
    return this.execStatusReply("GETSET", key, value);
  }

  hdel(key: string, field: string, ...fields: string[]) {
    return this.execIntegerReply("HDEL", key, field, ...fields);
  }

  hexists(key: string, field: string) {
    return this.execIntegerReply("HEXISTS", key, field);
  }

  hget(key: string, field: string) {
    return this.execStatusReply("HGET", key, field);
  }

  hgetall(key: string) {
    return this.execArrayReply("HGETALL", key);
  }

  hincrby(key: string, field: string, increment: number) {
    return this.execIntegerReply("HINCRBY", key, field, increment);
  }

  hincrbyfloat(key: string, field: string, increment: number) {
    return this.execStatusReply("HINCRBYFLOAT", key, field, increment);
  }

  hkeys(key: string) {
    return this.execArrayReply("HKEYS", key);
  }

  hlen(key: string) {
    return this.execIntegerReply("HLEN", key);
  }

  hmget(key: string, ...fields: string[]) {
    return this.execArrayReply("HMGET", key, ...fields);
  }

  hmset(key: string, ...field_values: string[]) {
    return this.execStatusReply("HMSET", key, ...field_values);
  }

  hset(key: string, field: string, value: string) {
    return this.execIntegerReply("HSET", key, field, value);
  }

  hsetnx(key: string, field: string, value: string) {
    return this.execIntegerReply("HSETNX", key, field, value);
  }

  hstrlen(key: string, field: string) {
    return this.execIntegerReply("HSTRLEN", key, field);
  }

  hvals(key: string) {
    return this.execArrayReply("HVALS", key);
  }

  incr(key: string) {
    return this.execIntegerReply("INCR", key);
  }

  incrby(key: string, increment: number) {
    return this.execIntegerReply("INCRBY", key, increment);
  }

  incrbyfloat(key: string, increment: number) {
    return this.execStatusReply("INCRBYFLOAT", key, increment);
  }

  info(section?: string) {
    if (section) {
      return this.execStatusReply("INFO", section);
    } else {
      return this.execStatusReply("INFO");
    }
  }

  keys(pattern: string) {
    return this.execArrayReply("KEYS", pattern);
  }

  lastsave() {
    return this.execIntegerReply("LASTSAVE");
  }

  lindex(key: string, index: number) {
    return this.execStatusReply("LINDEX", key, index);
  }

  linsert(key: string, arg: "BEFORE" | "AFTER", pivot: string, value: string) {
    return this.execIntegerReply("LINSERT", key, arg);
  }

  llen(key: string) {
    return this.execIntegerReply("LLEN", key);
  }

  lpop(key: string) {
    return this.execStatusReply("LPOP", key);
  }

  lpush(key: string, ...values: (string | number)[]) {
    return this.execIntegerReply("LPUSH", key, ...values);
  }

  lpushx(key: string, value: string | number) {
    return this.execIntegerReply("LPUSHX", key, value);
  }

  lrange(key: string, start: number, stop: number) {
    return this.execArrayReply("LRANGE", key, start, stop);
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
    return this.execArrayReply("MEMORY", "HELP");
  }

  memory_malloc_stats() {
    return this.execStatusReply("MEMORY", "MALLOC", "STATS");
  }

  memory_purge() {
    return this.execStatusReply("MEMORY", "PURGE");
  }

  memory_stats() {
    return this.execArrayReply("MEMORY", "STATS");
  }

  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    }
  ) {
    const args: (number | string)[] = [key];
    if (opts && typeof opts.samples === "number") {
      args.push("SAMPLES", opts.samples);
    }
    return this.execIntegerReply("MEMORY", "USAGE", ...args);
  }

  mget(...keys: string[]) {
    return this.execArrayReply("MGET", ...keys);
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
    }
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
    return this.execIntegerReply("OBJECT", "ENCODING", key);
  }

  object_freq(key: string) {
    return this.execBulkReply("OBJECT", "FREQ", key);
  }

  object_help() {
    return this.execBulkReply("OBJECT", "HELP");
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
    if (message) return this.execStatusReply("PING", message);
    else return this.execStatusReply("PING");
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
    return this.execArrayReply("PUBSUB", "CHANNELS", pattern);
  }

  pubsub_numpat() {
    return this.execIntegerReply("PUBSUB", "NUMPAT");
  }

  pubsub_numsubs(...channels: string[]) {
    return this.execArrayReply("PUBSUB", "NUMSUBS", ...channels);
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
    REPLACE?: boolean
  ) {
    const args = [key, ttl, serialized_value];
    if (REPLACE) {
      args.push("REPLACE");
    }
    return this.execStatusReply("RESTORE", ...args);
  }

  role() {
    return this.execArrayReply("ROLE");
  }

  rpop(key: string) {
    return this.execStatusReply("RPOP", key);
  }

  rpoplpush(source: string, destination: string) {
    return this.execStatusReply("RPOPLPUSH", source, destination);
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
    return this.execArrayReply("SCRIPT", "EXISTS", ...sha1s);
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
    return this.execArrayReply("SDIFF", ...keys);
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
      mode?: "NX" | "XX";
    }
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
    return this.execBulkReply("SET", ...args);
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
    return this.execArrayReply("SINTER", key, ...keys);
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
    return this.execRawReply("SLOWLOG", subcommand, ...argument);
  }

  smembers(key: string) {
    return this.execArrayReply("SMEMBERS", key);
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
      destination?: string;
    }
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

  spop(key: string): Promise<string>;
  spop(key: string, count: number): Promise<string[]>;
  spop(...args: (string | number)[]): Promise<string | string[]> {
    return this.execStatusReply("SPOP", ...args);
  }

  srandmember(key: string, count?: number) {
    if (count != null) return this.execStatusReply("SRANDMEMBER", key, count);
    else return this.execStatusReply("SRANDMEMBER", key);
  }

  srem(key: string, ...members: string[]) {
    return this.execIntegerReply("SREM", key, ...members);
  }

  strlen(key: string) {
    return this.execIntegerReply("STRLEN", key);
  }

  sunion(...keys: string[]) {
    return this.execArrayReply("SUNION", ...keys);
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
    return this.execArrayReply("TIME");
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
    } else {
      args.push(...scoreOrArr);
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
    return this.execStatusReply("ZINCRBY", key, increment, member);
  }

  zinterstore(
    destination: string,
    numkeys: number,
    keys: string[],
    weights?: number | number[],
    aggregate?: string
  ) {
    const args = this.pushZInterStoreArgs(
      [destination, numkeys],
      keys,
      weights,
      aggregate
    );
    return this.execIntegerReply("ZINTERSTORE", ...args);
  }

  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    }
  ): Promise<number> {
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
    aggregate?: string
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

  zlexcount(key: string, min: number, max: number) {
    return this.execIntegerReply("ZLEXCOUNT", key, min, max);
  }

  zpopmax(key: string, count?: number) {
    if (count != null) return this.execArrayReply("ZPOPMAX", key, count);
    else return this.execArrayReply("ZPOPMAX", key);
  }

  zpopmin(key: string, count?: number) {
    if (count != null) return this.execArrayReply("ZPOPMIN", key, count);
    else return this.execArrayReply("ZPOPMIN", key);
  }

  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply("ZRANGE", ...args);
  }

  zrangebylex(
    key: string,
    min: number,
    max: number,
    opts?: {
      withScore?: boolean;
      count?: number;
    }
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZRANGEBYLEX", ...args);
  }

  zrevrangebylex(
    key: string,
    max: number,
    min: number,
    opts?: {
      withScore?: boolean;
      count?: number;
    }
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZREVRANGEBYLEX", ...args);
  }

  zrangebyscore(
    key: string,
    min: number,
    max: number,
    opts?: {
      withScore?: boolean;
      count?: number;
    }
  ) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZRANGEBYSCORE", ...args);
  }

  private pushZrangeOpts(
    args: (number | string)[],
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
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

  zremrangebylex(key: string, min: number, max: number) {
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
    }
  ) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply("ZREVRANGE", ...args);
  }

  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ) {
    const args = this.pushZrangeOpts([key, max, min], opts);
    return this.execArrayReply("ZREVRANGEBYSCORE", ...args);
  }

  zrevrank(key: string, member: string) {
    return this.execIntegerReply("ZREVRANK", key, member);
  }

  zscore(key: string, member: string) {
    return this.execStatusReply("ZSCORE", key, member);
  }

  scan(
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ) {
    const arg = this.pushScanOpts([cursor], opts);
    return this.execArrayReply("SCAN", ...arg);
  }

  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("SSCAN", ...arg);
  }

  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("HSCAN", ...arg);
  }

  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    }
  ) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("ZSCAN", ...arg);
  }

  private pushScanOpts(
    arg: (number | string)[],
    opts?: {
      pattern?: string;
      count?: number;
    }
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
  db
}: RedisConnectOptions): Promise<Redis> {
  const dialOpts: Deno.ConnectOptions = {
    hostname,
    port: prasePortLike(port)
  };
  if (!Number.isSafeInteger(dialOpts.port)) {
    throw new Error("deno-redis: opts.port is invalid");
  }
  const conn: Deno.Conn = tls
    ? await Deno.connectTLS(dialOpts)
    : await Deno.connect(dialOpts);
  const client = await create(conn, conn, conn);
  if (db) {
    await client.select(db);
  }
  return client;
}

export function create(
  closer: Closer,
  writer: Writer,
  reader: Reader,
  executor?: CommandExecutor
) {
  return new RedisImpl(
    closer,
    new BufWriter(writer),
    new BufReader(reader),
    executor
  );
}
