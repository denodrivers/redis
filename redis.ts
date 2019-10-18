import DialOptions = Deno.DialOptions;

type Reader = Deno.Reader;
type Writer = Deno.Writer;
type Closer = Deno.Closer;
import { BufReader, BufWriter } from "./vendor/https/deno.land/std/io/bufio.ts";
import { yellow } from "./vendor/https/deno.land/std/fmt/colors.ts";
import { ConnectionClosedError } from "./errors.ts";
import { psubscribe, RedisSubscription, subscribe } from "./pubsub.ts";
import { RedisRawReply, sendCommand } from "./io.ts";
import { createRedisPipeline, RedisPipeline } from "./pipeline.ts";
import { deferred, Deferred } from "./vendor/https/deno.land/std/util/async.ts";

export type Redis = {
  // Connection
  auth(password: string): Promise<string>;
  echo(message: string): Promise<string>;
  ping(message?: string): Promise<string>;
  quit(): Promise<string>;
  select(index: number): Promise<string>;
  swapdb(index, index2): Promise<string>;
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
  object_refcount(key: string);
  object_encoding(key: string);
  object_ideltime(key: string);
  object_freq(key: string);
  object_help();
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
  bitop(operation, destkey: string, ...keys: string[]): Promise<number>;
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
  psetex(key: string, milliseconds: number, value: string);
  set(
    key: string,
    value: string,
    opts?: {
      ex?: number;
      px?: number;
      mode?: "NX" | "XX";
    }
  ): Promise<string>;
  setbit(key: string, offset: number, value: string): Promise<number>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  setnx(key: string, value: string): Promise<number>;
  setrange(key: string, offset: number, value: string): Promise<number>;
  strlen(key: string): Promise<number>;
  get(key: string): Promise<string>;
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
  );
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
  );
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
  spop(key: string, count?: number): Promise<string>;
  srandmember(key: string, count?: number): Promise<string>;
  srem(key: string, ...members: string[]): Promise<number>;
  sunion(...keys: string[]): Promise<string[]>;
  sunionstore(destination, ...keys: string[]): Promise<number>;
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
  zincrby(key: string, increment, member: string): Promise<string>;
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
  bgrewriteaof(): Promise<string>;
  bgsave(): Promise<string>;
  // client //
  command(): Promise<string[]>;
  command_count(): Promise<number>;
  command_getkeys(): Promise<string[]>;
  command_info(...command_names: string[]): Promise<string[]>;
  config_get(parameter: string): Promise<string[]>;
  config_rewrite(): Promise<string>;
  config_set(parameter: string, value: string): Promise<string>;
  config_resetstat(): Promise<string>;
  dbsize(): Promise<number>;
  debug_object(key: string): Promise<string>;
  debug_segfault(): Promise<string>;
  flushall(async?: boolean): Promise<string>;
  flushdb(async?: boolean): Promise<string>;
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
  monitor();
  role(): Promise<string[]>;
  save(): Promise<string>;
  shutdown(arg: "NOSAVE" | "SAVE"): Promise<string>;
  slaveof(host: string, port: string | number): Promise<string>;
  replicaof(host: string, port: string | number): Promise<string>;
  slowlog(subcommand: string, ...argument: string[]);
  sync();
  time(): Promise<string[]>;
  // Scripting
  eval(script: string, key: string, arg: string);
  eval(script: string, keys: string[], args: string[]);
  evalsha(sha1: string, key: string, arg: string);
  evalsha(sha1: string, keys: string[], args: string[]);
  script_debug(arg: "YES" | "SYNC" | "NO"): Promise<string>;
  script_exists(...sha1s: string[]): Promise<string[]>;
  script_flush(): Promise<string>;
  script_kill(): Promise<string>;
  script_load(script: string): Promise<string>;
  // multi
  multi(): Promise<string>;
  exec(): Promise<any[]>;
  discard(): Promise<string>;
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
  );
  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  );
  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    }
  );
  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    }
  );

  readonly isClosed: boolean;
  close();
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
  ): Promise<string> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    return reply as string;
  }

  async execArrayReply(
    command: string,
    ...args: (string | number)[]
  ): Promise<any[]> {
    const [_, reply] = await this.executor.execRawReply(command, ...args);
    return reply as any[];
  }

  append(key, value) {
    return this.execIntegerReply("APPEND", key, value);
  }

  auth(password) {
    return this.execBulkReply("AUTH", password);
  }

  bgrewriteaof() {
    return this.execBulkReply("BGREWRITEAOF");
  }

  bgsave() {
    return this.execBulkReply("BGSAVE");
  }

  bitcount(key, start?, end?) {
    return this.execIntegerReply("BITCOUNT", key, start, end);
  }

  bitfield() {
    return this.execArrayReply("BITFIELD");
  }

  bitop(operation, destkey, ...keys) {
    return this.execIntegerReply("BITOP", operation, destkey, ...keys);
  }

  bitpos(key, bit, start?, end?) {
    return this.execIntegerReply("BITPOS", key, bit, start, end);
  }

  blpop(keys, timeout) {
    if (typeof keys === "string") {
      return this.execArrayReply("BLPOP", keys, timeout);
    } else {
      return this.execArrayReply("BLPOP", ...keys, timeout);
    }
  }

  brpop(keys, timeout) {
    if (typeof keys === "string") {
      return this.execArrayReply("BRPOP", keys, timeout);
    } else {
      return this.execArrayReply("BRPOP", ...keys, timeout);
    }
  }

  brpoplpush(source, destination, timeout) {
    return this.execStatusReply("BRPOPLPUSH", source, destination, timeout);
  }

  bzpopmin(keys, timeout) {
    if (typeof keys === "string") {
      return this.execArrayReply("BZPOPMIN", keys, timeout);
    } else {
      return this.execArrayReply("BZPOPMIN", ...keys, timeout);
    }
  }

  bzpopmax(keys, timeout) {
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

  command_info(...command_names) {
    return this.execArrayReply("COMMAND", "INFO", ...command_names);
  }

  config_get(parameter) {
    return this.execArrayReply("CONFIG", "GET", parameter);
  }

  config_rewrite() {
    return this.execBulkReply("CONFIG", "REWRITE");
  }

  config_set(parameter, value) {
    return this.execBulkReply("CONFIG", "SET", parameter, value);
  }

  config_resetstat() {
    return this.execBulkReply("CONFIG", "RESETSTAT");
  }

  dbsize() {
    return this.execIntegerReply("DBSIZE");
  }

  debug_object(key) {
    return this.execBulkReply("DEBUG", "OBJECT", key);
  }

  debug_segfault() {
    return this.execBulkReply("DEBUG", "SEGFAULT");
  }

  decr(key) {
    return this.execIntegerReply("DECR", key);
  }

  decrby(key, decrement) {
    return this.execIntegerReply("DECRBY", key, decrement);
  }

  del(key, ...keys) {
    return this.execIntegerReply("DEL", key, ...keys);
  }

  discard() {
    return this.execBulkReply("DISCARD");
  }

  dump(key) {
    return this.execStatusReply("DUMP", key);
  }

  echo(message) {
    return this.execStatusReply("ECHO", message);
  }

  eval(script, keys, args) {
    return this.doEval("EVAL", script, keys, args);
  }

  evalsha(sha1, keys, args) {
    return this.doEval("EVALSHA", sha1, keys, args);
  }

  private doEval(cmd, script, keys, args) {
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

  exists(...keys) {
    return this.execIntegerReply("EXISTS", ...keys);
  }

  expire(key, seconds) {
    return this.execIntegerReply("EXPIRE", key, seconds);
  }

  expireat(key, timestamp) {
    return this.execIntegerReply("EXPIREAT", key, timestamp);
  }

  flushall(async) {
    const args = async ? ["ASYNC"] : [];
    return this.execBulkReply("FLUSHALL", ...args);
  }

  flushdb(async) {
    const args = async ? ["ASYNC"] : [];
    return this.execBulkReply("FLUSHDB", ...args);
  }

  geoadd(key, ...args) {
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

  geohash(key, ...members) {
    return this.execArrayReply("GEOHASH", key, ...members);
  }

  geopos(key, ...members) {
    return this.execArrayReply("GEOPOS", key, ...members);
  }

  geodist(key, member1, member2, unit?) {
    return this.execStatusReply("GEODIST", key, member1, member2, unit);
  }

  georadius(key, longitude, latitude, radius, unit, opts?) {
    const args = this.pushGeoRadiusOpts(
      [key, longitude, latitude, radius, unit],
      opts
    );
    return this.execArrayReply("GEORADIUS", ...args);
  }

  georadiusbymember(key, member, radius, unit, opts?) {
    const args = this.pushGeoRadiusOpts([key, member, radius, unit], opts);
    return this.execArrayReply("GEORADIUSBYMEMBER", ...args);
  }

  private pushGeoRadiusOpts(args: (string | number)[], opts) {
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

  get(key) {
    return this.execStatusReply("GET", key);
  }

  getbit(key, offset) {
    return this.execIntegerReply("GETBIT", key, offset);
  }

  getrange(key, start, end) {
    return this.execStatusReply("GETRANGE", key, start, end);
  }

  getset(key, value) {
    return this.execStatusReply("GETSET", key, value);
  }

  hdel(key, field, ...fields) {
    return this.execIntegerReply("HDEL", key, field, ...fields);
  }

  hexists(key, field) {
    return this.execIntegerReply("HEXISTS", key, field);
  }

  hget(key, field) {
    return this.execStatusReply("HGET", key, field);
  }

  hgetall(key) {
    return this.execArrayReply("HGETALL", key);
  }

  hincrby(key, field, increment) {
    return this.execIntegerReply("HINCRBY", key, field, increment);
  }

  hincrbyfloat(key, field, increment) {
    return this.execStatusReply("HINCRBYFLOAT", key, field, increment);
  }

  hkeys(key) {
    return this.execArrayReply("HKEYS", key);
  }

  hlen(key) {
    return this.execIntegerReply("HLEN", key);
  }

  hmget(key, ...fields) {
    return this.execArrayReply("HMGET", key, ...fields);
  }

  hmset(key, ...field_values) {
    return this.execBulkReply("HMSET", key, ...field_values);
  }

  hset(key, field, value) {
    return this.execIntegerReply("HSET", key, field, value);
  }

  hsetnx(key, field, value) {
    return this.execIntegerReply("HSETNX", key, field, value);
  }

  hstrlen(key, field) {
    return this.execIntegerReply("HSTRLEN", key, field);
  }

  hvals(key) {
    return this.execArrayReply("HVALS", key);
  }

  incr(key) {
    return this.execIntegerReply("INCR", key);
  }

  incrby(key, increment) {
    return this.execIntegerReply("INCRBY", key, increment);
  }

  incrbyfloat(key, increment) {
    return this.execStatusReply("INCRBYFLOAT", key, increment);
  }

  info(section?) {
    return this.execStatusReply("INFO", section);
  }

  keys(pattern) {
    return this.execArrayReply("KEYS", pattern);
  }

  lastsave() {
    return this.execIntegerReply("LASTSAVE");
  }

  lindex(key, index) {
    return this.execStatusReply("LINDEX", key, index);
  }

  linsert(key, arg: "BEFORE" | "AFTER", pivot, value) {
    return this.execIntegerReply("LINSERT", key, arg);
  }

  llen(key) {
    return this.execIntegerReply("LLEN", key);
  }

  lpop(key) {
    return this.execStatusReply("LPOP", key);
  }

  lpush(key, ...values) {
    return this.execIntegerReply("LPUSH", key, ...values);
  }

  lpushx(key, value) {
    return this.execIntegerReply("LPUSHX", key, value);
  }

  lrange(key, start, stop) {
    return this.execArrayReply("LRANGE", key, start, stop);
  }

  lrem(key, count, value) {
    return this.execIntegerReply("LREM", key, count, value);
  }

  lset(key, index, value) {
    return this.execBulkReply("LSET", key, index, value);
  }

  ltrim(key, start, stop) {
    return this.execBulkReply("LTRIM", key, start, stop);
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
    return this.execBulkReply("MEMORY", "PURGE");
  }

  memory_stats() {
    return this.execArrayReply("MEMORY", "STATS");
  }

  memory_usage(key, opts?) {
    const args = [key];
    if (opts && typeof opts.samples === "number") {
      args.push("SAMPLES", opts.samples);
    }
    return this.execIntegerReply("MEMORY", "USAGE", ...args);
  }

  mget(...keys) {
    return this.execArrayReply("MGET", ...keys);
  }

  migrate(host, port, key, destination_db, timeout, opts?) {
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
    //
  }

  move(key, db) {
    return this.execIntegerReply("MOVE", key, db);
  }

  mset(...key_values) {
    return this.execBulkReply("MSET", ...key_values);
  }

  msetnx(...key_values) {
    return this.execIntegerReply("MSETNX", ...key_values);
  }

  multi() {
    return this.execBulkReply("MULTI");
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

  persist(key) {
    return this.execIntegerReply("PERSIST", key);
  }

  pexpire(key, milliseconds) {
    return this.execIntegerReply("PEXPIRE", key, milliseconds);
  }

  pexpireat(key, milliseconds_timestamp) {
    return this.execIntegerReply("PEXPIREAT", key, milliseconds_timestamp);
  }

  pfadd(key, element, ...elements) {
    return this.execIntegerReply("PFADD", key, element, ...elements);
  }

  pfcount(key, ...keys) {
    return this.execIntegerReply("PFCOUNT", key, ...keys);
  }

  pfmerge(destkey, ...sourcekeys) {
    return this.execBulkReply("PFMERGE", destkey, ...sourcekeys);
  }

  ping(message?) {
    return this.execBulkReply("PING", message);
  }

  psetex(key, milliseconds, value) {
    //
  }

  // PubSub

  publish(channel, message) {
    return this.execIntegerReply("PUBLISH", channel, message);
  }

  subscribe(...channels) {
    return subscribe(this.writer, this.reader, ...channels);
  }

  psubscribe(...patterns) {
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

  pttl(key) {
    return this.execIntegerReply("PTTL", key);
  }

  quit() {
    try {
      return this.execBulkReply("QUIT");
    } finally {
      this._isClosed = true;
    }
  }

  randomkey() {
    return this.execStatusReply("RANDOMKEY");
  }

  readonly() {
    return this.execBulkReply("READONLY");
  }

  readwrite() {
    return this.execBulkReply("READWRITE");
  }

  rename(key, newkey) {
    return this.execBulkReply("RENAME", key, newkey);
  }

  renamenx(key, newkey) {
    return this.execIntegerReply("RENAMENX", key, newkey);
  }

  restore(key, ttl, serialized_value, REPLACE?) {
    const args = [key, ttl, serialized_value];
    if (REPLACE) {
      args.push("REPLACE");
    }
    return this.execBulkReply("RESTORE", ...args);
  }

  role() {
    return this.execArrayReply("ROLE");
  }

  rpop(key) {
    return this.execStatusReply("RPOP", key);
  }

  rpoplpush(source, destination) {
    return this.execStatusReply("RPOPLPUSH", source, destination);
  }

  rpush(key, ...values) {
    return this.execIntegerReply("RPUSH", key, ...values);
  }

  rpushx(key, value) {
    return this.execIntegerReply("RPUSHX", key, value);
  }

  sadd(key, member, ...members) {
    return this.execIntegerReply("SADD", key, member, ...members);
  }

  save() {
    return this.execBulkReply("SAVE");
  }

  scard(key) {
    return this.execIntegerReply("SCARD", key);
  }

  script_debug(arg: "YES" | "SYNC" | "NO") {
    return this.execBulkReply("SCRIPT", "DEBUG", arg);
  }

  script_exists(...sha1s) {
    return this.execArrayReply("SCRIPT", "EXISTS", ...sha1s);
  }

  script_flush() {
    return this.execBulkReply("SCRIPT", "FLUSH");
  }

  script_kill() {
    return this.execBulkReply("SCRIPT", "KILL");
  }

  script_load(script) {
    return this.execStatusReply("SCRIPT", "LOAD", script);
  }

  sdiff(...keys) {
    return this.execArrayReply("SDIFF", ...keys);
  }

  sdiffstore(destination, key, ...keys) {
    return this.execIntegerReply("SDIFFSTORE", destination, key, ...keys);
  }

  select(index) {
    return this.execBulkReply("SELECT", index);
  }

  set(key, value, opts?) {
    const args = [key, value];
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

  setbit(key, offset, value) {
    return this.execIntegerReply("SETBIT", key, offset, value);
  }

  setex(key, seconds, value) {
    return this.execBulkReply("SETEX", key, seconds, value);
  }

  setnx(key, value) {
    return this.execIntegerReply("SETNX", key, value);
  }

  setrange(key, offset, value) {
    return this.execIntegerReply("SETRANGE", key, offset, value);
  }

  shutdown(arg) {
    return this.execBulkReply("SHUTDOWN", arg);
  }

  sinter(key, ...keys) {
    return this.execArrayReply("SINTER", key, ...keys);
  }

  sinterstore(destination, key, ...keys) {
    return this.execIntegerReply("SINTERSTORE", destination, key, ...keys);
  }

  sismember(key, member) {
    return this.execIntegerReply("SISMEMBER", key, member);
  }

  slaveof(host, port) {
    return this.execBulkReply("SLAVEOF", host, port);
  }

  replicaof(host, port) {
    return this.execBulkReply("REPLICAOF", host, port);
  }

  slowlog(subcommand, ...argument) {
    return this.execRawReply("SLOWLOG", subcommand, ...argument);
  }

  smembers(key) {
    return this.execArrayReply("SMEMBERS", key);
  }

  smove(source, destination, member) {
    return this.execIntegerReply("SMOVE", source, destination, member);
  }

  sort(key, opts?) {
    const args = [key];
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

  spop(...args) {
    return this.execStatusReply("SPOP", ...args);
  }

  srandmember(...args) {
    return this.execStatusReply("SRANDMEMBER", ...args);
  }

  srem(key, ...members) {
    return this.execIntegerReply("SREM", key, ...members);
  }

  strlen(key) {
    return this.execIntegerReply("STRLEN", key);
  }

  sunion(...keys) {
    return this.execArrayReply("SUNION", ...keys);
  }

  sunionstore(destination, ...keys) {
    return this.execIntegerReply("SUNIONSTORE", destination, ...keys);
  }

  swapdb(index, index2) {
    return this.execBulkReply("SWAPDB", index, index2);
  }

  sync() {
    //
    throw new Error("not implemented");
  }

  time() {
    return this.execArrayReply("TIME");
  }

  touch(...keys) {
    return this.execIntegerReply("TOUCH", ...keys);
  }

  ttl(key) {
    return this.execIntegerReply("TTL", key);
  }

  type(key) {
    return this.execBulkReply("TYPE", key);
  }

  unlink(...keys) {
    return this.execIntegerReply("UNLINK", ...keys);
  }

  unwatch() {
    return this.execBulkReply("UNWATCH");
  }

  wait(numreplicas, timeout) {
    return this.execIntegerReply("WAIT", numreplicas, timeout);
  }

  watch(key, ...keys) {
    return this.execBulkReply("WATCH", key, ...keys);
  }

  zadd(key, scoreOrArr, memberOrOpts, opts?) {
    const args = [key];
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

  zcard(key) {
    return this.execIntegerReply("ZCARD", key);
  }

  zcount(key, min, max) {
    return this.execIntegerReply("ZCOUNT", key, min, max);
  }

  zincrby(key, increment, member) {
    return this.execStatusReply("ZINCRBY", key, increment, member);
  }

  zinterstore(destination, numkeys, keys, weights?, aggregate?) {
    const args = this.pushZInterStoreArgs(
      [destination, numkeys],
      keys,
      weights,
      aggregate
    );
    return this.execIntegerReply("ZINTERSTORE", ...args);
  }

  zunionstore(destination, keys, opts?): Promise<number> {
    const args = [destination, keys.length, keys];
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

  private pushZInterStoreArgs(args, keys, weights?, aggregate?) {
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

  zlexcount(key, min, max) {
    return this.execIntegerReply("ZLEXCOUNT", key, min, max);
  }

  zpopmax(key, count?) {
    return this.execArrayReply("ZPOPMAX", key, count);
  }

  zpopmin(key, count?) {
    return this.execArrayReply("ZPOPMIN", key, count);
  }

  zrange(key, start, stop, opts?) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply("ZRANGE", ...args);
  }

  zrangebylex(key, min, max, opts?) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZRANGEBYLEX", ...args);
  }

  zrevrangebylex(key, max, min, opts?) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZREVRANGEBYLEX", ...args);
  }

  zrangebyscore(key, min, max, opts?) {
    const args = this.pushZrangeOpts([key, min, max], opts);
    return this.execArrayReply("ZRANGEBYSCORE", ...args);
  }

  private pushZrangeOpts(args, opts?) {
    if (opts) {
      if (opts.withScore) {
        args.push("WITHSCORE");
      }
      if (opts.offset !== void 0 && opts.count !== void 0) {
        args.push("LIMIT", opts.offset, opts.count);
      }
    }
    return args;
  }

  zrank(key, member) {
    return this.execIntegerReply("ZRANK", key, member);
  }

  zrem(key, ...members) {
    return this.execIntegerReply("ZREM", key, ...members);
  }

  zremrangebylex(key, min, max) {
    return this.execIntegerReply("ZREMRANGEBYLEX", key, min, max);
  }

  zremrangebyrank(key, start, stop) {
    return this.execIntegerReply("ZREMRANGEBYRANK", key, start, stop);
  }

  zremrangebyscore(key, min, max) {
    return this.execIntegerReply("ZREMRANGEBYSCORE", key, min, max);
  }

  zrevrange(key, start, stop, opts?) {
    const args = this.pushZrangeOpts([key, start, stop], opts);
    return this.execArrayReply("ZREVRANGE", ...args);
  }

  zrevrangebyscore(key, max, min, opts?) {
    const args = this.pushZrangeOpts([key, max, min], opts);
    return this.execArrayReply("ZREVRANGEBYSCORE", ...args);
  }

  zrevrank(key, member) {
    return this.execIntegerReply("ZREVRANK", key, member);
  }

  zscore(key, member) {
    return this.execStatusReply("ZSCORE", key, member);
  }

  scan(cursor, opts?) {
    const arg = this.pushScanOpts([cursor], opts);
    return this.execArrayReply("SCAN", ...arg);
  }

  sscan(key, cursor, opts?) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("SSCAN", ...arg);
  }

  hscan(key, cursor, opts?) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("HSCAN", ...arg);
  }

  zscan(key, cursor, opts?) {
    const arg = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("ZSCAN", ...arg);
  }

  private pushScanOpts(arg, opts?) {
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
};

/**
 * Connect to Redis server
 * @param opts redis server's url http/https url with port number
 * Examples:
 *  const conn = connect({hostname: "127.0.0.1", port: 6379})// -> tcp, 127.0.0.1:6379
 *  const conn = connect({hostname: "redis.proxy", port: 443, tls: true}) // -> TLS, redis.proxy:443
 */
export async function connect(
  opts: string | RedisConnectOptions
): Promise<Redis> {
  let conn: Deno.Conn;
  if (typeof opts === "string") {
    console.warn(
      yellow(
        "deno-redis: connect(addr) is now deprecated and will be removed in v0.5.0 (now v0.4.x)"
      )
    );
    const [h, p] = opts.split(":");
    if (!p) {
      throw new Error("redis: port must be specified");
    }
    const dialOptions: DialOptions = { port: parseInt(p) };
    if (h) {
      dialOptions.hostname = h;
    }
    conn = await Deno.dial(dialOptions);
  } else {
    const { hostname } = opts;
    const port = parseInt(`${opts.port}`);
    if (!Number.isSafeInteger(port)) {
      throw new Error("deno-redis: opts.port is invalid");
    }
    if (opts.tls) {
      conn = await Deno.dialTLS({
        hostname,
        port
      });
    } else {
      conn = await Deno.dial({
        hostname,
        port
      });
    }
  }
  return create(conn, conn, conn);
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
