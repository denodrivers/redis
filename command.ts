import { RedisSubscription } from "./pubsub.ts";
import { RedisPipeline } from "./pipeline.ts";

export type Raw = Status | Integer | Bulk | ConditionalArray;
export type Status = string;
export type Integer = number;
export type Bulk = string | undefined;
export type BulkString = string;
export type BulkNil = undefined;
export type ConditionalArray = Raw[];
export type RedisCommands = {
  // Connection
  auth(password: string): Promise<Status>;
  auth(username: string, password: string): Promise<Status>;
  echo(message: string): Promise<BulkString>;
  ping(): Promise<Status>;
  ping(message: string): Promise<BulkString>;
  quit(): Promise<Status>;
  select(index: number): Promise<Status>;
  swapdb(index: number, index2: number): Promise<Status>;
  // Keys
  del(...keys: string[]): Promise<Integer>;
  dump(key: string): Promise<Bulk>;
  exists(...keys: string[]): Promise<Integer>;
  expire(key: string, seconds: number): Promise<Integer>;
  expireat(key: string, timestamp: string): Promise<Integer>;
  keys(pattern: string): Promise<BulkString[]>;
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
  ): Promise<Status>;
  move(key: string, db: string): Promise<Integer>;
  object_refcount(key: string): Promise<Integer | BulkNil>;
  object_encoding(key: string): Promise<Bulk>;
  object_ideltime(key: string): Promise<Integer | BulkNil>;
  // Return value may different
  object_freq(key: string): Promise<Integer>;
  object_help(): Promise<BulkString[]>;
  persist(key: string): Promise<Integer>;
  pexpire(key: string, milliseconds: number): Promise<Integer>;
  pexpireat(key: string, milliseconds_timestamp: number): Promise<Integer>;
  pttl(key: string): Promise<Integer>;
  randomkey(): Promise<Bulk>;
  rename(key: string, newkey: string): Promise<Status>;
  renamenx(key: string, newkey: string): Promise<Integer>;
  restore(
    key: string,
    ttl: number,
    serialized_value: string,
    replace?: boolean,
  ): Promise<Status>;

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

  touch(...keys: string[]): Promise<Integer>;
  ttl(key: string): Promise<Integer>;
  type(key: string): Promise<Status>;
  unlink(...keys: string[]): Promise<Integer>;
  wait(numreplicas: number, timeout: number): Promise<Integer>;
  // String
  append(key: string, value: string): Promise<Integer>;
  bitcount(key: string): Promise<Integer>;
  bitcount(key: string, start: number, end: number): Promise<Integer>;
  bitfield(key: string, opts?: {
    get?: { type: string; offset: number | string };
    set?: { type: string; offset: number | string; value: number };
    incrby?: { type: string; offset: number | string; increment: number };
  }): Promise<Integer[]>;
  bitfield(key: string, opts?: {
    get?: { type: string; offset: number };
    set?: { type: string; offset: number; value: number };
    incrby?: { type: string; offset: number; increment: number };
    overflow: "WRAP" | "SAT" | "FAIL";
  }): Promise<(Integer | BulkNil)[]>;
  bitop(
    operation: "AND" | "OR" | "XOR" | "NOT",
    destkey: string,
    ...keys: string[]
  ): Promise<Integer>;
  bitpos(
    key: string,
    bit: number,
    start?: number,
    end?: number,
  ): Promise<Integer>;
  decr(key: string): Promise<Integer>;
  decrby(key: string, decrement: number): Promise<Integer>;
  incr(key: string): Promise<Integer>;
  incrby(key: string, increment: number): Promise<Integer>;
  incrbyfloat(key: string, increment: number): Promise<Bulk>;
  mget(...keys: string[]): Promise<Bulk[]>;
  mset(key: string, value: string): Promise<Status>;
  mset(...key_values: string[]): Promise<Status>;
  msetnx(key: string, value: string): Promise<Integer>;
  msetnx(...key_values: string[]): Promise<Integer>;
  psetex(key: string, milliseconds: number, value: string): Promise<Status>;
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
  setbit(key: string, offset: number, value: string): Promise<Integer>;
  setex(key: string, seconds: number, value: string): Promise<Status>;
  setnx(key: string, value: string): Promise<Integer>;
  setrange(key: string, offset: number, value: string): Promise<Integer>;
  strlen(key: string): Promise<Integer>;
  get(key: string): Promise<Bulk>;
  getbit(key: string, offset: number): Promise<Integer>;
  getrange(key: string, start: number, end: number): Promise<BulkString>;
  getset(key: string, value: string): Promise<Bulk>;
  // Geo
  geoadd(
    key: string,
    longitude: number,
    latitude: number,
    member: string,
  ): Promise<Integer>;
  geoadd(
    key: string,
    ...longitude_latitude_member: [number, number, string][]
  ): Promise<Integer>;
  geohash(key: string, ...members: string[]): Promise<Bulk[]>;
  geopos(key: string, ...members: string[]): Promise<
    ([Integer, Integer] | BulkNil)[]
  >;
  geodist(
    key: string,
    member1: string,
    member2: string,
    unit?: "m" | "km" | "ft" | "mi",
  ): Promise<Bulk>;
  // FIXME: Return type is too conditional
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
    },
  ): Promise<ConditionalArray>;
  // FIXME: Return type is too conditional
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
    },
  ): Promise<ConditionalArray>;
  // Hash
  hdel(key: string, ...fields: string[]): Promise<Integer>;
  hexists(key: string, field: string): Promise<Integer>;
  hget(key: string, field: string): Promise<Bulk>;
  hgetall(key: string): Promise<BulkString[]>;
  hincrby(key: string, field: string, increment: number): Promise<Integer>;
  hincrbyfloat(key: string, field: string, increment: number): Promise<
    BulkString
  >;
  hkeys(key: string): Promise<BulkString[]>;
  hlen(key: string): Promise<Integer>;
  hmget(key: string, ...fields: string[]): Promise<Bulk[]>;
  /** @deprecated >= 4.0.0 use hset */
  hmset(key: string, field: string, value: string): Promise<Status>;
  /** @deprecated >= 4.0.0 use hset */
  hmset(key: string, ...field_values: string[]): Promise<Status>;
  hset(key: string, field: string, value: string): Promise<Integer>;
  hset(key: string, ...field_values: string[]): Promise<Integer>;
  hsetnx(key: string, field: string, value: string): Promise<Integer>;
  hstrlen(key: string, field: string): Promise<Integer>;
  hvals(key: string): Promise<BulkString[]>;
  // List
  blpop(key: string | string[], timeout: number): Promise<Bulk[]>;
  brpop(key: string | string[], timeout: number): Promise<Bulk[]>;
  brpoplpush(
    source: string,
    destination: string,
    timeout: number,
  ): Promise<Bulk | []>;
  lindex(key: string, index: number): Promise<Bulk>;
  linsert(
    key: string,
    loc: "BEFORE" | "AFTER",
    pivot: string,
    value: string,
  ): Promise<Integer>;
  llen(key: string): Promise<Integer>;
  lpop(key: string): Promise<Bulk>;
  lpush(key: string, ...values: string[]): Promise<Integer>;
  lpushx(key: string, value: string): Promise<Integer>;
  lrange(key: string, start: number, stop: number): Promise<BulkString[]>;
  lrem(key: string, count: number, value: string): Promise<Integer>;
  lset(key: string, index: number, value: string): Promise<Status>;
  ltrim(key: string, start: number, stop: number): Promise<Status>;
  rpop(key: string): Promise<Bulk>;
  rpoplpush(source: string, destination: string): Promise<Bulk>;
  rpush(key: string, ...values: string[]): Promise<Integer>;
  rpushx(key: string, value: string): Promise<Integer>;
  // HypeprLogLog
  pfadd(key: string, ...elements: string[]): Promise<Integer>;
  pfcount(...keys: string[]): Promise<Integer>;
  pfmerge(destkey: string, ...sourcekeys: string[]): Promise<Status>;
  // PubSub
  publish(channel: string, message: string): Promise<Integer>;
  psubscribe(...patterns: string[]): Promise<RedisSubscription>;
  subscribe(...channels: string[]): Promise<RedisSubscription>;
  pubsub_channels(pattern: string): Promise<BulkString[]>;
  pubsub_numsubs(...channels: string[]): Promise<[BulkString, Integer][]>;
  pubsub_numpat(): Promise<Integer>;
  // Cluster
  readonly(): Promise<Status>;
  readwrite(): Promise<Status>;
  // Set
  sadd(key: string, ...members: string[]): Promise<Integer>;
  scard(key: string): Promise<Integer>;
  sdiff(...keys: string[]): Promise<BulkString[]>;
  sdiffstore(destination: string, ...keys: string[]): Promise<Integer>;
  sinter(...keys: string[]): Promise<BulkString[]>;
  sinterstore(destination: string, ...keys: string[]): Promise<Integer>;
  sismember(key: string, member: string): Promise<Integer>;
  smembers(key: string): Promise<BulkString[]>;
  smove(source: string, destination: string, member: string): Promise<
    Integer
  >;
  spop(key: string): Promise<Bulk>;
  spop(key: string, count: number): Promise<BulkString[]>;
  srandmember(key: string): Promise<Bulk>;
  srandmember(key: string, count: number): Promise<BulkString[]>;
  srem(key: string, ...members: string[]): Promise<Integer>;
  sunion(...keys: string[]): Promise<BulkString[]>;
  sunionstore(destination: string, ...keys: string[]): Promise<Integer>;
  // SortedSet
  bzpopmin(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  bzpopmax(key: string | string[], timeout: number): Promise<
    [BulkString, BulkString, BulkString] | []
  >;
  zadd(
    key: string,
    score: number,
    member: string,
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    },
  ): Promise<Integer>;
  zadd(
    key: string,
    score_members: [number, string][],
    opts?: {
      nxx?: "NX" | "XX";
      ch?: boolean;
      incr?: boolean;
    },
  ): Promise<Integer>;
  zcard(key: string): Promise<Integer>;
  zcount(key: string, min: number, max: number): Promise<Integer>;
  zincrby(key: string, increment: number, member: string): Promise<BulkString>;
  zinterstore(
    destination: string,
    numkeys: number,
    keys: string | string[],
    weights?: number | number[],
    aggregate?: "SUM" | "MIN" | "MAX",
  ): Promise<Integer>;
  zlexcount(key: string, min: string, max: string): Promise<Integer>;
  zpopmax(key: string, count?: number): Promise<BulkString[]>;
  zpopmin(key: string, count?: number): Promise<BulkString[]>;
  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ): Promise<BulkString[]>;
  zrangebylex(
    key: string,
    min: string,
    max: string,
    opts?: {
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrevrangebylex(
    key: string,
    max: number | string,
    min: number | string,
    opts?: {
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    opts?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrank(key: string, member: string): Promise<Integer | BulkNil>;
  zrem(key: string, ...members: string[]): Promise<Integer>;
  zremrangebylex(key: string, min: string, max: string): Promise<Integer>;
  zremrangebyrank(key: string, start: number, stop: number): Promise<Integer>;
  zremrangebyscore(key: string, min: number, max: number): Promise<Integer>;
  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: {
      withScore?: boolean;
    },
  ): Promise<BulkString[]>;
  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    ops?: {
      withScore?: boolean;
      offset?: number;
      count?: number;
    },
  ): Promise<BulkString[]>;
  zrevrank(key: string, member: string): Promise<Integer | BulkNil>;
  zscore(key: string, member: string): Promise<Bulk>;
  zunionstore(
    destination: string,
    keys: string[],
    opts?: {
      weights?: number[];
      aggregate?: "SUM" | "MIN" | "MAX";
    },
  ): Promise<Integer>;
  // Cluster
  // cluster //
  // Server
  acl_cat(parameter?: string): Promise<BulkString[]>;
  acl_deluser(parameter: string): Promise<Integer>;
  acl_genpass(parameter?: number): Promise<Status>;
  acl_getuser(parameter: string): Promise<BulkString[]>;
  acl_help(): Promise<BulkString[]>;
  acl_list(): Promise<BulkString[]>;
  acl_load(): Promise<Status>;
  acl_log(parameter: string | number): Promise<Status | BulkString[]>;
  acl_save(): Promise<Status>;
  acl_setuser(username: string, rule: string): Promise<Status>;
  acl_users(): Promise<BulkString[]>;
  acl_whoami(): Promise<Status>;
  bgrewriteaof(): Promise<Status>;
  bgsave(): Promise<Status>;
  // client //
  command(): Promise<
    [BulkString, Integer, BulkString[], Integer, Integer, Integer]
  >;
  command_count(): Promise<Integer>;
  command_getkeys(): Promise<BulkString[]>;
  command_info(...command_names: string[]): Promise<[
    [
      BulkString,
      Integer,
      BulkString[],
      Integer,
      Integer,
      Integer,
      [BulkString[]],
    ] | BulkNil,
  ]>;
  config_get(parameter: string): Promise<BulkString[]>;
  config_rewrite(): Promise<Status>;
  config_set(parameter: string, value: string): Promise<Status>;
  config_resetstat(): Promise<Status>;
  dbsize(): Promise<Integer>;
  debug_object(key: string): Promise<Status>;
  debug_segfault(): Promise<Status>;
  flushall(async?: boolean): Promise<Status>;
  flushdb(async?: boolean): Promise<Status>;
  info(section?: string): Promise<Status>;
  lastsave(): Promise<Integer>;
  memory_doctor(): Promise<Status>;
  memory_help(): Promise<BulkString[]>;
  memory_malloc_stats(): Promise<Status>;
  memory_purge(): Promise<Status>;
  memory_stats(): Promise<ConditionalArray>;
  memory_usage(
    key: string,
    opts?: {
      samples?: number;
    },
  ): Promise<Integer>;
  module_list(): Promise<BulkString[]>;
  module_load(path: string, args: string): Promise<Status>;
  module_unload(name: string): Promise<Status>;
  monitor(): void;
  role(): Promise<
    | ["master", Integer, BulkString[][]]
    | ["slave", BulkString, Integer, BulkString, Integer]
    | ["sentinel", BulkString[]]
  >;
  save(): Promise<Status>;
  shutdown(arg: "NOSAVE" | "SAVE"): Promise<Status>;
  slaveof(host: string, port: string | number): Promise<Status>;
  replicaof(host: string, port: string | number): Promise<Status>;
  slowlog(subcommand: string, ...argument: string[]): Promise<
    ConditionalArray
  >;
  sync(): void;
  time(): Promise<[BulkString, BulkString]>;
  // Scripting
  eval(script: string, numkeys: number, key: string, arg: string): Promise<Raw>;
  eval(
    script: string,
    numkeys: number,
    keys: string[],
    args: string[],
  ): Promise<Raw>;
  evalsha(
    sha1: string,
    numkeys: number,
    key: string,
    arg: string,
  ): Promise<Raw>;
  evalsha(
    sha1: string,
    numkeys: number,
    keys: string[],
    args: string[],
  ): Promise<Raw>;
  script_debug(arg: "YES" | "SYNC" | "NO"): Promise<Status>;
  script_exists(...sha1s: string[]): Promise<Integer[]>;
  script_flush(): Promise<Status>;
  script_kill(): Promise<Status>;
  script_load(script: string): Promise<Status>;
  // Transactions
  discard(): Promise<Status>;
  exec(): Promise<ConditionalArray>;
  multi(): Promise<Status>;
  unwatch(): Promise<Status>;
  watch(...keys: string[]): Promise<Status>;
  // pipeline
  tx(): RedisPipeline;
  pipeline(): RedisPipeline;
  // scan
  scan(
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  hscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  sscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
      count?: number;
    },
  ): Promise<[BulkString, BulkString[]]>;
  zscan(
    key: string,
    cursor: number,
    opts?: {
      pattern?: string;
    },
  ): Promise<[BulkString, BulkString[]]>;

  readonly isClosed: boolean;
  readonly isConnected: boolean;
  close(): void;
};
