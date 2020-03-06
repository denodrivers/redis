type Reader = Deno.Reader;
type Writer = Deno.Writer;
type Closer = Deno.Closer;
import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import { psubscribe, RedisSubscription, subscribe } from "./pubsub.ts";
import { RedisRawReply, muxExecutor } from "./io.ts";
import { createRedisPipeline, RedisPipeline } from "./pipeline.ts";

export type Redis<TRaw, TStatus, TInteger, TBulk, TArray, TBulkNil> = {
  // Connection
  auth(password: string): TBulk;
  echo(message: string): TBulk;
  ping(message?: string): TStatus;
  quit(): TStatus;
  select(index: number): TStatus;
  swapdb(index: number, index2: number): TStatus;
  // Keys
  del(...keys: string[]): TInteger;
  dump(key: string): TStatus;
  exists(...keys: string[]): TInteger;
  expire(key: string, seconds: number): TInteger;
  expireat(key: string, timestamp: string): TInteger;
  keys(pattern: string): TArray;
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
  ): TStatus;
  move(key: string, db: string): TInteger;
  object_refcount(key: string): TInteger;
  object_encoding(key: string): TInteger;
  object_ideltime(key: string): TInteger;
  object_freq(key: string): TBulk;
  object_help(): TBulk;
  persist(key: string): TInteger;
  pexpire(key: string, milliseconds: number): TInteger;
  pexpireat(key: string, milliseconds_timestamp: number): TInteger;
  pttl(key: string): TInteger;
  randomkey(): TStatus;
  rename(key: string, newkey: string): TStatus;
  renamenx(key: string, newkey: string): TInteger;
  restore(
    key: string,
    ttl: number,
    serialized_value: string,
    replace?: boolean
  ): TStatus;
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
  ): TInteger | TArray;
  touch(...keys: string[]): TInteger;
  ttl(key: string): TInteger;
  type(key: string): TStatus;
  unlink(...keys: string[]): TInteger;
  wait(numreplicas: number, timeout: number): TInteger;
  // String
  append(key: string, value: string): TInteger;
  bitcount(key: string): TInteger;
  bitcount(key: string, start: number, end: number): TInteger;
  bitfield(): TArray;
  bitop(
    operation: "AND" | "OR" | "XOR" | "NOT",
    destkey: string,
    ...keys: string[]
  ): TInteger;
  bitpos(key: string, bit: number, start?: number, end?: number): TInteger;
  decr(key: string): TInteger;
  decrby(key: string, decrement: number): TInteger;
  incr(key: string): TInteger;
  incrby(key: string, increment: number): TInteger;
  incrbyfloat(key: string, increment: number): TStatus;
  mget(...keys: string[]): TArray;
  mset(key: string, value: string): TStatus;
  mset(...key_values: string[]): TStatus;
  msetnx(key: string, value: string): TInteger;
  msetnx(...key_values: string[]): TInteger;
  psetex(key: string, milliseconds: number, value: string): TStatus;
  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
      mode?: "NX" | "XX";
    }
  ): TBulk;
  setbit(key: string, offset: number, value: string): TInteger;
  setex(key: string, seconds: number, value: string): TStatus;
  setnx(key: string, value: string): TInteger;
  setrange(key: string, offset: number, value: string): TInteger;
  strlen(key: string): TInteger;
  get(key: string): TBulk;
  getbit(key: string, offset: number): TInteger;
  getrange(key: string, start: number, end: number): TStatus;
  getset(key: string, value: string): TStatus;
  // Geo
  geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string
  ): TInteger;
  geoadd(
    key: string,
    ...longitude_latitude_member: [number | number | string][]
  ): TInteger;
  geohash(key: string, ...members: string[]): TArray;
  geopos(key: string, ...members: string[]): TArray;
  geodist(
    key: string,
    member1: string,
    member2: string,
    unit?: "m" | "km" | "ft" | "mi"
  ): TStatus;
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
  ): TArray;
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
  ): TArray;
  // Hash
  hdel(key: string, ...fields: string[]): TInteger;
  hexists(key: string, field: string): TInteger;
  hget(key: string, field: string): TStatus;
  hgetall(key: string): TArray;
  hincrby(key: string, field: string, increment: number): TInteger;
  hincrbyfloat(key: string, field: string, increment: number): TStatus;
  hkeys(key: string): TArray;
  hlen(key: string): TInteger;
  hmget(key: string, ...fields: string[]): TArray;
  hmset(key: string, field: string, value: string): TStatus;
  hmset(key: string, ...field_values: string[]): TStatus;
  hset(key: string, field: string, value: string): TInteger;
  hsetnx(key: string, field: string, value: string): TInteger;
  hstrlen(key: string, field: string): TInteger;
  hvals(key: string): TArray;
  // List
  blpop(key: string | string[], timeout: number): TArray;
  brpop(key: string | string[], timeout: number): TArray;
  brpoplpush(source: string, destination: string, timeout: number): TStatus;
  lindex(key: string, index: number): TStatus;
  linsert(
    key: string,
    loc: "BEFORE" | "AFTER",
    pivot: string,
    value: string
  ): TInteger;
  llen(key: string): TInteger;
  lpop(key: string): TStatus;
  lpush(key: string, ...values: string[]): TInteger;
  lpushx(key: string, value: string): TInteger;
  lrange(key: string, start: number, stop: number): TArray;
  lrem(key: string, count: number, value: string): TInteger;
  lset(key: string, index: number, value: string): TStatus;
  ltrim(key: string, start: number, stop: number): TStatus;
  rpop(key: string): TStatus;
  rpoplpush(source: string, destination: string): TStatus;
  rpush(key: string, ...values: string[]): TInteger;
  rpushx(key: string, value: string): TInteger;
  // HypeprLogLog
  pfadd(key: string, ...elements: string[]): TInteger;
  pfcount(...keys: string[]): TInteger;
  pfmerge(destkey: string, ...sourcekeys: string[]): TStatus;
  // PubSub
  publish(channel: string, message: string): TInteger;
  psubscribe(...patterns: string[]): Promise<RedisSubscription>;
  subscribe(...channels: string[]): Promise<RedisSubscription>;
  pubsub_channels(pattern: string): TArray;
  pubsub_numsubs(...channels: string[]): TArray;
  pubsub_numpat(): TInteger;
  // Cluster
  readonly(): TStatus;
  readwrite(): TStatus;
  // Set
  sadd(key: string, ...members: string[]): TInteger;
  scard(key: string): TInteger;
  sdiff(...keys: string[]): TArray;
  sdiffstore(destination: string, ...keys: string[]): TInteger;
  sinter(...keys: string[]): TArray;
  sinterstore(destination: string, ...keys: string[]): TInteger;
  sismember(key: string, member: string): TInteger;
  smembers(key: string): TArray;
  smove(source: string, destination: string, member: string): TInteger;
  spop(key: string): TBulk;
  spop(key: string, count: number): TArray;
  srandmember(key: string, count?: number): TStatus;
  srem(key: string, ...members: string[]): TInteger;
  sunion(...keys: string[]): TArray;
  sunionstore(destination: string, ...keys: string[]): TInteger;
  // SortedSet
  bzpopmin(key: string | string[], timeout: number): TArray;
  bzpopmax(key: string | string[], timeout: number): TArray;
  zadd(
    key: string,
    score: number,
    member: string,
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): TInteger;
  zadd(
    key: string,
    score_members: (number | string)[],
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    }
  ): TInteger;
  zcard(key: string): TInteger;
  zcount(key: string, min: number, max: number): TInteger;
  zincrby(key: string, increment: number, member: string): TStatus;
  zinterstore(
    destination: string,
    numkeys: number,
    keys: string | string[],
    weights?: number | number[],
    aggregate?: "SUM" | "MIN" | "MAX"
  ): TInteger;
  zlexcount(key: string, min: number, max: number): TInteger;
  zpopmax(key: string, count?: number): TArray;
  zpopmin(key: string, count?: number): TArray;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): TArray;
  zrangebylex(
    key: string,
    min: number,
    max: number,
    opts?: {
      offset?: number;
      count?: number;
    }
  ): TArray;
  zrevrangebylex(
    key: string,
    max: number,
    min: number,
    opts?: {
      offset?: number;
      count?: number;
    }
  ): TArray;
  zrangebyscore(
    key: string,
    min: number,
    max: number,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): TArray;
  zrank(key: string, member: string): TInteger | TBulkNil;
  zrem(key: string, ...members: string[]): TInteger;
  zremrangebylex(key: string, min: number, max: number): TInteger;
  zremrangebyrank(key: string, start: number, stop: number): TInteger;
  zremrangebyscore(key: string, min: number, max: number): TInteger;
  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    }
  ): TArray;
  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    ops?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    }
  ): TArray;
  zrevrank(key: string, member: string): TInteger | TBulkNil;
  zscore(key: string, member: string): TStatus;
  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    }
  ): TInteger;
  // Cluster
  // cluster //
  // Server
  bgrewriteaof(): TBulk;
  bgsave(): TBulk;
  // client //
  command(): TArray;
  command_count(): TInteger;
  command_getkeys(): TArray;
  command_info(...command_names: string[]): TArray;
  config_get(parameter: string): TArray;
  config_rewrite(): TBulk;
  config_set(parameter: string, value: string): TBulk;
  config_resetstat(): TBulk;
  dbsize(): TInteger;
  debug_object(key: string): TBulk;
  debug_segfault(): TBulk;
  flushall(async?: boolean): TBulk;
  flushdb(async?: boolean): TBulk;
  info(section?: string): TStatus;
  lastsave(): TInteger;
  memory_doctor(): TStatus;
  memory_help(): TArray;
  memory_malloc_stats(): TStatus;
  memory_purge(): TStatus;
  memory_stats(): TArray;
  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    }
  ): TInteger;
  monitor(): void;
  role(): TArray;
  save(): TStatus;
  shutdown(arg: "NOSAVE" | "SAVE"): TStatus;
  slaveof(host: string, port: string | number): TStatus;
  replicaof(host: string, port: string | number): TStatus;
  slowlog(subcommand: string, ...argument: string[]): TRaw;
  sync(): void;
  time(): TArray;
  // Scripting
  eval(script: string, key: string, arg: string): TRaw;
  eval(script: string, keys: string[], args: string[]): TRaw;
  evalsha(sha1: string, key: string, arg: string): TRaw;
  evalsha(sha1: string, keys: string[], args: string[]): TRaw;
  script_debug(arg: "YES" | "SYNC" | "NO"): TStatus;
  script_exists(...sha1s: string[]): TArray;
  script_flush(): TStatus;
  script_kill(): TStatus;
  script_load(script: string): TStatus;
  // multi
  multi(): TStatus;
  exec(): TRaw;
  discard(): TBulk;
  watch(...keys: string[]): TStatus;
  unwatch(): TStatus;
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
  ): TArray;
  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ): TArray;
  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  ): TArray;
  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    }
  ): TArray;

  readonly isClosed: boolean;
  close(): void;
};

export type CommandFunc<T> = (
  comand: string,
  ...args: (string | number)[]
) => T;

export interface CommandExecutor<TRaw, TStatus, TInteger, TBulk, TArray> {
  execRawReply: CommandFunc<TRaw>;
  execStatusReply: CommandFunc<TStatus>;
  execIntegerReply: CommandFunc<TInteger>;
  execBulkReply: CommandFunc<TBulk>;
  execArrayReply: CommandFunc<TArray>;
}

class RedisImpl<TRaw, TStatus, TInteger, TBulk, TArray, TBulkNil>
  implements Redis<TRaw, TStatus, TInteger, TBulk, TArray, TBulkNil> {
  _isClosed = false;
  get isClosed() {
    return this._isClosed;
  }

  constructor(
    private closer: Closer,
    private writer: BufWriter,
    private reader: BufReader,
    private executor: CommandExecutor<TRaw, TStatus, TInteger, TBulk, TArray>
  ) {}

  private execRawReply = this.executor.execRawReply;
  private execIntegerReply = this.executor.execIntegerReply;
  private execBulkReply = this.executor.execBulkReply;
  private execStatusReply = this.executor.execStatusReply;
  private execArrayReply = this.executor.execArrayReply;

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

  bzpopmin(keys: string | string[], timeout: number) {
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
    return this.execBulkReply("ECHO", message);
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
    return this.execRawReply("EXEC");
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

  spop(key: string): TBulk;
  spop(key: string, count: number): TArray;
  spop(key: string, count?: number) {
    if (typeof count === "number") {
      return this.execArrayReply("SPOP", key, count);
    } else {
      return this.execBulkReply("SPOP", key);
    }
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
}: RedisConnectOptions) {
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

  const bufr = new BufReader(conn);
  const bufw = new BufWriter(conn);
  const exec = muxExecutor(bufr, bufw);
  const client = await create(conn, conn, conn, exec);
  if (db) {
    await client.select(db);
  }
  return client;
}

export function create<TRaw, TStatus, TInteger, TBulk, TArray>(
  closer: Closer,
  writer: Writer,
  reader: Reader,
  executor: CommandExecutor<TRaw, TStatus, TInteger, TBulk, TArray>
) {
  return new RedisImpl(
    closer,
    new BufWriter(writer),
    new BufReader(reader),
    executor
  );
}
