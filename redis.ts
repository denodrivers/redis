import type { RedisCommands } from "./command.ts";
import { Connection, RedisConnection } from "./connection.ts";
import { CommandExecutor, MuxExecutor } from "./executor.ts";
import type {
  Bulk,
  BulkNil,
  BulkString,
  ConditionalArray,
  Integer,
  Raw,
  Status,
} from "./io.ts";
import { createRedisPipeline } from "./pipeline.ts";
import { psubscribe, subscribe } from "./pubsub.ts";
import {
  convertMap,
  isCondArray,
  isNumber,
  isString,
  parseXGroupDetail,
  parseXId,
  parseXMessage,
  parseXPendingConsumers,
  parseXPendingCounts,
  parseXReadReply,
  rawnum,
  rawstr,
  StartEndCount,
  XAddFieldValues,
  XClaimJustXId,
  XClaimMessages,
  XClaimOpts,
  XId,
  XIdAdd,
  XIdInput,
  XIdNeg,
  XIdPos,
  xidstr,
  XKeyId,
  XKeyIdGroup,
  XKeyIdGroupLike,
  XKeyIdLike,
  XMaxlen,
  XReadGroupOpts,
  XReadIdData,
  XReadStreamRaw,
} from "./stream.ts";

export type Redis = RedisCommands & {
  readonly connection: Connection;
  readonly executor: CommandExecutor;
  readonly isClosed: boolean;
  readonly isConnected: boolean;
  close(): void;
};

export class RedisImpl implements Redis {
  readonly connection: Connection;
  readonly executor: CommandExecutor;

  get isClosed() {
    return this.connection.isClosed;
  }

  get isConnected() {
    return this.connection.isConnected;
  }

  constructor(connection: Connection, executor: CommandExecutor) {
    this.connection = connection;
    this.executor = executor;
  }

  close(): void {
    this.connection.close();
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

  acl_cat(categoryname?: string) {
    if (categoryname !== undefined) {
      return this.execArrayReply<BulkString>("ACL", "CAT", categoryname);
    }
    return this.execArrayReply<BulkString>("ACL", "CAT");
  }

  acl_deluser(...usernames: string[]) {
    return this.execIntegerReply("ACL", "DELUSER", ...usernames);
  }

  acl_genpass(bits?: number) {
    if (bits !== undefined) {
      return this.execBulkReply<BulkString>("ACL", "GENPASS", bits);
    }
    return this.execBulkReply<BulkString>("ACL", "GENPASS");
  }

  acl_getuser(username: string) {
    return this.execArrayReply<BulkString | BulkString[]>(
      "ACL",
      "GETUSER",
      username,
    );
  }

  acl_help() {
    return this.execArrayReply<BulkString>("ACL", "HELP");
  }

  acl_list() {
    return this.execArrayReply<BulkString>("ACL", "LIST");
  }

  acl_load() {
    return this.execStatusReply("ACL", "LOAD");
  }

  acl_log(count: number): Promise<BulkString[]>;
  acl_log(mode: "RESET"): Promise<Status>;
  acl_log(param: number | "RESET") {
    if (param === "RESET") {
      return this.execStatusReply("ACL", "LOG", "RESET");
    }
    return this.execArrayReply<BulkString>("ACL", "LOG", param);
  }

  acl_save() {
    return this.execStatusReply("ACL", "SAVE");
  }

  acl_setuser(username: string, ...rules: string[]) {
    return this.execStatusReply("ACL", "SETUSER", username, ...rules);
  }

  acl_users() {
    return this.execArrayReply<BulkString>("ACL", "USERS");
  }

  acl_whoami() {
    return this.execBulkReply<BulkString>("ACL", "WHOAMI");
  }

  append(key: string, value: string | number) {
    return this.execIntegerReply("APPEND", key, value);
  }

  auth(param1: string, param2?: string) {
    if (param2 !== undefined) {
      return this.execStatusReply("AUTH", param1, param2);
    }
    return this.execStatusReply("AUTH", param1);
  }

  bgrewriteaof() {
    return this.execStatusReply("BGREWRITEAOF");
  }

  bgsave() {
    return this.execStatusReply("BGSAVE");
  }

  bitcount(key: string, start?: number, end?: number) {
    if (start !== undefined && end !== undefined) {
      return this.execIntegerReply("BITCOUNT", key, start, end);
    }
    return this.execIntegerReply("BITCOUNT", key);
  }

  bitfield(
    key: string,
    opts?: {
      get?: { type: string; offset: number | string };
      set?: { type: string; offset: number | string; value: number };
      incrby?: { type: string; offset: number | string; increment: number };
      overflow?: "WRAP" | "SAT" | "FAIL";
    },
  ) {
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
    return this.execArrayReply<Integer>("BITFIELD", ...args);
  }

  bitop(operation: string, destkey: string, ...keys: string[]) {
    return this.execIntegerReply("BITOP", operation, destkey, ...keys);
  }

  bitpos(key: string, bit: number, start?: number, end?: number) {
    if (start !== undefined && end !== undefined) {
      return this.execIntegerReply("BITPOS", key, bit, start, end);
    }
    if (start !== undefined) {
      return this.execIntegerReply("BITPOS", key, bit, start);
    }
    return this.execIntegerReply("BITPOS", key, bit);
  }

  blpop(timeout: number, ...keys: string[]) {
    return this.execArrayReply("BLPOP", ...keys, timeout) as Promise<
      [BulkString, BulkString] | []
    >;
  }

  brpop(timeout: number, ...keys: string[]) {
    return this.execArrayReply("BRPOP", ...keys, timeout) as Promise<
      [BulkString, BulkString] | []
    >;
  }

  brpoplpush(source: string, destination: string, timeout: number) {
    return this.execBulkReply("BRPOPLPUSH", source, destination, timeout);
  }

  bzpopmin(timeout: number, ...keys: string[]) {
    return this.execArrayReply("BZPOPMIN", ...keys, timeout) as Promise<
      [BulkString, BulkString, BulkString] | []
    >;
  }

  bzpopmax(timeout: number, ...keys: string[]) {
    return this.execArrayReply("BZPOPMAX", ...keys, timeout) as Promise<
      [BulkString, BulkString, BulkString] | []
    >;
  }

  cluster_addslots(...slots: number[]) {
    return this.execStatusReply("CLUSTER", "ADDSLOTS", ...slots);
  }

  cluster_countfailurereports(nodeId: string) {
    return this.execIntegerReply("CLUSTER", "COUNT-FAILURE-REPORTS", nodeId);
  }

  cluster_countkeysinslot(slot: number) {
    return this.execIntegerReply("CLUSTER", "COUNTKEYSINSLOT", slot);
  }

  cluster_delslots(...slots: number[]) {
    return this.execStatusReply("CLUSTER", "DELSLOTS", ...slots);
  }

  cluster_failover(mode?: "FORCE" | "TAKEOVER") {
    if (mode) {
      return this.execStatusReply("CLUSTER", "FAILOVER", mode);
    }
    return this.execStatusReply("CLUSTER", "FAILOVER");
  }

  cluster_flushslots() {
    return this.execStatusReply("CLUSTER", "FLUSHSLOTS");
  }

  cluster_forget(nodeId: string) {
    return this.execStatusReply("CLUSTER", "FORGET", nodeId);
  }

  cluster_getkeysinslot(slot: number, count: number) {
    return this.execArrayReply<BulkString>(
      "CLUSTER",
      "GETKEYSINSLOT",
      slot,
      count,
    );
  }

  cluster_info() {
    return this.execStatusReply("CLUSTER", "INFO");
  }

  cluster_keyslot(key: string) {
    return this.execIntegerReply("CLUSTER", "KEYSLOT", key);
  }

  cluster_meet(ip: string, port: number) {
    return this.execStatusReply("CLUSTER", "MEET", ip, port);
  }

  cluster_myid() {
    return this.execStatusReply("CLUSTER", "MYID");
  }

  cluster_nodes() {
    return this.execBulkReply<BulkString>("CLUSTER", "NODES");
  }

  cluster_replicas(nodeId: string) {
    return this.execArrayReply<BulkString>("CLUSTER", "REPLICAS", nodeId);
  }

  cluster_replicate(nodeId: string) {
    return this.execStatusReply("CLUSTER", "REPLICATE", nodeId);
  }

  cluster_reset(mode?: "HARD" | "SOFT") {
    if (mode) {
      return this.execStatusReply("CLUSTER", "RESET", mode);
    }
    return this.execStatusReply("CLUSTER", "RESET");
  }

  cluster_saveconfig() {
    return this.execStatusReply("CLUSTER", "SAVECONFIG");
  }

  cluster_setslot(
    slot: number,
    subcommand: "IMPORTING" | "MIGRATING" | "NODE" | "STABLE",
    nodeId?: string,
  ) {
    if (nodeId !== undefined) {
      return this.execStatusReply(
        "CLUSTER",
        "SETSLOT",
        slot,
        subcommand,
        nodeId,
      );
    }
    return this.execStatusReply("CLUSTER", "SETSLOT", slot, subcommand);
  }

  cluster_slaves(nodeId: string) {
    return this.execArrayReply<BulkString>("CLUSTER", "SLAVES", nodeId);
  }

  cluster_slots() {
    return this.execArrayReply("CLUSTER", "SLOTS");
  }

  command() {
    return this.execArrayReply("COMMAND") as Promise<
      [BulkString, Integer, BulkString[], Integer, Integer, Integer][]
    >;
  }

  command_count() {
    return this.execIntegerReply("COMMAND", "COUNT");
  }

  command_getkeys() {
    return this.execArrayReply<BulkString>("COMMAND", "GETKEYS");
  }

  command_info(...commandNames: string[]) {
    return this.execArrayReply("COMMAND", "INFO", ...commandNames) as Promise<
      (
        | [BulkString, Integer, BulkString[], Integer, Integer, Integer]
        | BulkNil
      )[]
    >;
  }

  config_get(parameter: string) {
    return this.execArrayReply<BulkString>("CONFIG", "GET", parameter);
  }

  config_resetstat() {
    return this.execStatusReply("CONFIG", "RESETSTAT");
  }

  config_rewrite() {
    return this.execStatusReply("CONFIG", "REWRITE");
  }

  config_set(parameter: string, value: string | number) {
    return this.execStatusReply("CONFIG", "SET", parameter, value);
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

  del(...keys: string[]) {
    return this.execIntegerReply("DEL", ...keys);
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

  async eval(script: string, keys: string[], args: string[]) {
    const [_, raw] = await this.executor.exec(
      "EVAL",
      script,
      keys.length,
      ...keys,
      ...args,
    );
    return raw;
  }

  async evalsha(sha1: string, keys: string[], args: string[]) {
    const [_, raw] = await this.executor.exec(
      "EVALSHA",
      sha1,
      keys.length,
      ...keys,
      ...args,
    );
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

  flushall(async?: boolean) {
    if (async) {
      return this.execStatusReply("FLUSHALL", "ASYNC");
    }
    return this.execStatusReply("FLUSHALL");
  }

  flushdb(async?: boolean) {
    if (async) {
      return this.execStatusReply("FLUSHDB", "ASYNC");
    }
    return this.execStatusReply("FLUSHDB");
  }

  // deno-lint-ignore no-explicit-any
  geoadd(key: string, ...params: any[]) {
    const args: (string | number)[] = [key];
    if (Array.isArray(params[0])) {
      args.push(...params.flatMap((e) => e));
    } else if (typeof params[0] === "object") {
      for (const [member, lnglat] of Object.entries(params[0])) {
        args.push(...(lnglat as [number, number]), member);
      }
    } else {
      args.push(...params);
    }
    return this.execIntegerReply("GEOADD", ...args);
  }

  geohash(key: string, ...members: string[]) {
    return this.execArrayReply<Bulk>("GEOHASH", key, ...members);
  }

  geopos(key: string, ...members: string[]) {
    return this.execArrayReply("GEOPOS", key, ...members) as Promise<
      ([BulkString, BulkString] | BulkNil)[]
    >;
  }

  geodist(
    key: string,
    member1: string,
    member2: string,
    unit?: "m" | "km" | "ft" | "mi",
  ) {
    if (unit) {
      return this.execBulkReply("GEODIST", key, member1, member2, unit);
    }
    return this.execBulkReply("GEODIST", key, member1, member2);
  }

  georadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      with_coord?: boolean;
      with_dist?: boolean;
      with_hash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      store_dist?: string;
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
    unit: "m" | "km" | "ft" | "mi",
    opts?: {
      with_coord?: boolean;
      with_dist?: boolean;
      with_hash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      store_dist?: string;
    },
  ) {
    const args = this.pushGeoRadiusOpts([key, member, radius, unit], opts);
    return this.execArrayReply("GEORADIUSBYMEMBER", ...args);
  }

  private pushGeoRadiusOpts(
    args: (string | number)[],
    opts?: {
      with_coord?: boolean;
      with_dist?: boolean;
      with_hash?: boolean;
      count?: number;
      sort?: "ASC" | "DESC";
      store?: string;
      store_dist?: string;
    },
  ) {
    if (opts?.with_coord) {
      args.push("WITHCOORD");
    }
    if (opts?.with_dist) {
      args.push("WITHDIST");
    }
    if (opts?.with_hash) {
      args.push("WITHHASH");
    }
    if (opts?.count !== undefined) {
      args.push(opts.count);
    }
    if (opts?.sort) {
      args.push(opts.sort);
    }
    if (opts?.store !== undefined) {
      args.push(opts.store);
    }
    if (opts?.store_dist !== undefined) {
      args.push(opts.store_dist);
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

  hdel(key: string, ...fields: string[]) {
    return this.execIntegerReply("HDEL", key, ...fields);
  }

  hexists(key: string, field: string) {
    return this.execIntegerReply("HEXISTS", key, field);
  }

  hget(key: string, field: string) {
    return this.execBulkReply("HGET", key, field);
  }

  hgetall(key: string) {
    return this.execArrayReply<BulkString>("HGETALL", key);
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
    return this.execArrayReply<Bulk>("HMGET", key, ...fields);
  }

  // deno-lint-ignore no-explicit-any
  hmset(key: string, ...params: any[]) {
    const args = [key];
    if (Array.isArray(params[0])) {
      args.push(...params.flatMap((e) => e));
    } else if (typeof params[0] === "object") {
      for (const [field, value] of Object.entries(params[0])) {
        args.push(field, value as string);
      }
    } else {
      args.push(...params);
    }
    return this.execStatusReply("HMSET", ...args);
  }

  // deno-lint-ignore no-explicit-any
  hset(key: string, ...params: any[]) {
    const args = [key];
    if (Array.isArray(params[0])) {
      args.push(...params.flatMap((e) => e));
    } else if (typeof params[0] === "object") {
      for (const [field, value] of Object.entries(params[0])) {
        args.push(field, value as string);
      }
    } else {
      args.push(...params);
    }
    return this.execIntegerReply("HSET", ...args);
  }

  hsetnx(key: string, field: string, value: string) {
    return this.execIntegerReply("HSETNX", key, field, value);
  }

  hstrlen(key: string, field: string) {
    return this.execIntegerReply("HSTRLEN", key, field);
  }

  hvals(key: string) {
    return this.execArrayReply<BulkString>("HVALS", key);
  }

  incr(key: string) {
    return this.execIntegerReply("INCR", key);
  }

  incrby(key: string, increment: number) {
    return this.execIntegerReply("INCRBY", key, increment);
  }

  incrbyfloat(key: string, increment: number) {
    return this.execBulkReply<BulkString>("INCRBYFLOAT", key, increment);
  }

  info(section?: string) {
    if (section !== undefined) {
      return this.execStatusReply("INFO", section);
    }
    return this.execStatusReply("INFO");
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

  lpush(key: string, ...elements: (string | number)[]) {
    return this.execIntegerReply("LPUSH", key, ...elements);
  }

  lpushx(key: string, ...elements: (string | number)[]) {
    return this.execIntegerReply("LPUSHX", key, ...elements);
  }

  lrange(key: string, start: number, stop: number) {
    return this.execArrayReply<BulkString>("LRANGE", key, start, stop);
  }

  lrem(key: string, count: number, element: string | number) {
    return this.execIntegerReply("LREM", key, count, element);
  }

  lset(key: string, index: number, element: string | number) {
    return this.execStatusReply("LSET", key, index, element);
  }

  ltrim(key: string, start: number, stop: number) {
    return this.execStatusReply("LTRIM", key, start, stop);
  }

  memory_doctor() {
    return this.execBulkReply<BulkString>("MEMORY", "DOCTOR");
  }

  memory_help() {
    return this.execArrayReply<BulkString>("MEMORY", "HELP");
  }

  memory_malloc_stats() {
    return this.execBulkReply<BulkString>("MEMORY", "MALLOC", "STATS");
  }

  memory_purge() {
    return this.execStatusReply("MEMORY", "PURGE");
  }

  memory_stats() {
    return this.execArrayReply("MEMORY", "STATS");
  }

  memory_usage(key: string, opts?: { samples?: number }) {
    const args: (number | string)[] = [key];
    if (opts?.samples !== undefined) {
      args.push("SAMPLES", opts.samples);
    }
    return this.execIntegerReply("MEMORY", "USAGE", ...args);
  }

  mget(...keys: string[]) {
    return this.execArrayReply<Bulk>("MGET", ...keys);
  }

  migrate(
    host: string,
    port: number,
    key: string,
    destinationDB: string,
    timeout: number,
    opts?: {
      copy?: boolean;
      replace?: boolean;
      auth?: string;
      keys?: string[];
    },
  ) {
    const args = [host, port, key, destinationDB, timeout];
    if (opts?.copy) {
      args.push("COPY");
    }
    if (opts?.replace) {
      args.push("REPLACE");
    }
    if (opts?.auth !== undefined) {
      args.push("AUTH", opts.auth);
    }
    if (opts?.keys) {
      args.push("KEYS", ...opts.keys);
    }
    return this.execStatusReply("MIGRATE", ...args);
  }

  module_list() {
    return this.execArrayReply<BulkString>("MODULE", "LIST");
  }

  module_load(path: string, ...args: string[]) {
    return this.execStatusReply("MODULE", "LOAD", path, ...args);
  }

  module_unload(name: string) {
    return this.execStatusReply("MODULE", "UNLOAD", name);
  }

  monitor() {
    throw new Error("not supported yet");
  }

  move(key: string, db: string) {
    return this.execIntegerReply("MOVE", key, db);
  }

  // deno-lint-ignore no-explicit-any
  mset(...params: any[]) {
    const args: string[] = [];
    if (Array.isArray(params[0])) {
      args.push(...params.flatMap((e) => e));
    } else if (typeof params[0] === "object") {
      for (const [key, value] of Object.entries(params[0])) {
        args.push(key, value as string);
      }
    } else {
      args.push(...params);
    }
    return this.execStatusReply("MSET", ...args);
  }

  // deno-lint-ignore no-explicit-any
  msetnx(...params: any[]) {
    const args: string[] = [];
    if (Array.isArray(params[0])) {
      args.push(...params.flatMap((e) => e));
    } else if (typeof params[0] === "object") {
      for (const [key, value] of Object.entries(params[0])) {
        args.push(key, value as string);
      }
    } else {
      args.push(...params);
    }
    return this.execIntegerReply("MSETNX", ...args);
  }

  multi() {
    return this.execStatusReply("MULTI");
  }

  object_encoding(key: string) {
    return this.execBulkReply("OBJECT", "ENCODING", key);
  }

  object_freq(key: string) {
    return this.execIntegerOrNilReply("OBJECT", "FREQ", key);
  }

  object_help() {
    return this.execArrayReply<BulkString>("OBJECT", "HELP");
  }

  object_idletime(key: string) {
    return this.execIntegerOrNilReply("OBJECT", "IDLETIME", key);
  }

  object_refcount(key: string) {
    return this.execIntegerOrNilReply("OBJECT", "REFCOUNT", key);
  }

  persist(key: string) {
    return this.execIntegerReply("PERSIST", key);
  }

  pexpire(key: string, milliseconds: number) {
    return this.execIntegerReply("PEXPIRE", key, milliseconds);
  }

  pexpireat(key: string, millisecondsTimestamp: number) {
    return this.execIntegerReply("PEXPIREAT", key, millisecondsTimestamp);
  }

  pfadd(key: string, ...elements: string[]) {
    return this.execIntegerReply("PFADD", key, ...elements);
  }

  pfcount(...keys: string[]) {
    return this.execIntegerReply("PFCOUNT", ...keys);
  }

  pfmerge(destkey: string, ...sourcekeys: string[]) {
    return this.execStatusReply("PFMERGE", destkey, ...sourcekeys);
  }

  ping(message?: string) {
    if (message) {
      return this.execBulkReply<BulkString>("PING", message);
    }
    return this.execStatusReply("PING");
  }

  psetex(key: string, milliseconds: number, value: string) {
    return this.execStatusReply("PSETEX", key, milliseconds, value);
  }

  publish(channel: string, message: string) {
    return this.execIntegerReply("PUBLISH", channel, message);
  }

  subscribe(...channels: string[]) {
    return subscribe(this.connection, ...channels);
  }

  psubscribe(...patterns: string[]) {
    return psubscribe(this.connection, ...patterns);
  }

  pubsub_channels(pattern?: string) {
    if (pattern !== undefined) {
      return this.execArrayReply<BulkString>("PUBSUB", "CHANNELS", pattern);
    }
    return this.execArrayReply<BulkString>("PUBSUB", "CHANNELS");
  }

  pubsub_numpat() {
    return this.execIntegerReply("PUBSUB", "NUMPAT");
  }

  pubsub_numsub(...channels: string[]) {
    return this.execArrayReply<BulkString | Integer>(
      "PUBSUB",
      "NUMSUBS",
      ...channels,
    );
  }

  pttl(key: string) {
    return this.execIntegerReply("PTTL", key);
  }

  quit() {
    return this.execStatusReply("QUIT").finally(() => this.close());
  }

  randomkey() {
    return this.execBulkReply("RANDOMKEY");
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
    serializedValue: string,
    opts?: {
      replace?: boolean;
      absttl?: boolean;
      idletime?: number;
      freq?: number;
    },
  ) {
    const args = [key, ttl, serializedValue];
    if (opts?.replace) {
      args.push("REPLACE");
    }
    if (opts?.absttl) {
      args.push("ABSTTL");
    }
    if (opts?.idletime !== undefined) {
      args.push("IDLETIME", opts.idletime);
    }
    if (opts?.freq !== undefined) {
      args.push("FREQ", opts.freq);
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

  rpush(key: string, ...elements: (string | number)[]) {
    return this.execIntegerReply("RPUSH", key, ...elements);
  }

  rpushx(key: string, ...elements: (string | number)[]) {
    return this.execIntegerReply("RPUSHX", key, ...elements);
  }

  sadd(key: string, ...members: string[]) {
    return this.execIntegerReply("SADD", key, ...members);
  }

  save() {
    return this.execStatusReply("SAVE");
  }

  scard(key: string) {
    return this.execIntegerReply("SCARD", key);
  }

  script_debug(mode: "YES" | "SYNC" | "NO") {
    return this.execStatusReply("SCRIPT", "DEBUG", mode);
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

  sdiffstore(destination: string, ...keys: string[]) {
    return this.execIntegerReply("SDIFFSTORE", destination, ...keys);
  }

  select(index: number) {
    return this.execStatusReply("SELECT", index);
  }

  set(
    key: string,
    value: string,
    opts?: { ex?: number; px?: number; keepttl?: boolean },
  ): Promise<Status>;
  set(
    key: string,
    value: string,
    opts?: { ex?: number; px?: number; keepttl?: boolean; mode: "NX" | "XX" },
  ): Promise<Status | BulkNil>;
  set(
    key: string,
    value: string,
    opts?: { ex?: number; px?: number; keepttl?: boolean; mode?: "NX" | "XX" },
  ) {
    const args: (number | string)[] = [key, value];
    if (opts?.ex !== undefined) {
      args.push("EX", opts.ex);
    } else if (opts?.px !== undefined) {
      args.push("PX", opts.px);
    }
    if (opts?.keepttl) {
      args.push("KEEPTTL");
    }
    if (opts?.mode) {
      args.push(opts.mode);
      return this.execStatusOrNilReply("SET", ...args);
    }
    return this.execStatusReply("SET", ...args);
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

  shutdown(mode?: "NOSAVE" | "SAVE") {
    if (mode) {
      return this.execStatusReply("SHUTDOWN", mode);
    }
    return this.execStatusReply("SHUTDOWN");
  }

  sinter(...keys: string[]) {
    return this.execArrayReply<BulkString>("SINTER", ...keys);
  }

  sinterstore(destination: string, ...keys: string[]) {
    return this.execIntegerReply("SINTERSTORE", destination, ...keys);
  }

  sismember(key: string, member: string) {
    return this.execIntegerReply("SISMEMBER", key, member);
  }

  slaveof(host: string, port: number) {
    return this.execStatusReply("SLAVEOF", host, port);
  }

  slaveof_no_one() {
    return this.execStatusReply("SLAVEOF", "NO ONE");
  }

  replicaof(host: string, port: number) {
    return this.execStatusReply("REPLICAOF", host, port);
  }

  replicaof_no_one() {
    return this.execStatusReply("REPLICAOF", "NO ONE");
  }

  slowlog(subcommand: string, ...args: string[]) {
    return this.execArrayReply("SLOWLOG", subcommand, ...args);
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
      limit?: { offset: number; count: number };
      patterns?: string[];
      order?: "ASC" | "DESC";
      alpha?: boolean;
    },
  ): Promise<BulkString[]>;
  sort(
    key: string,
    opts?: {
      by?: string;
      limit?: { offset: number; count: number };
      patterns?: string[];
      order?: "ASC" | "DESC";
      alpha?: boolean;
      destination: string;
    },
  ): Promise<Integer>;
  sort(
    key: string,
    opts?: {
      by?: string;
      limit?: { offset: number; count: number };
      patterns?: string[];
      order?: "ASC" | "DESC";
      alpha?: boolean;
      destination?: string;
    },
  ) {
    const args: (number | string)[] = [key];
    if (opts?.by !== undefined) {
      args.push("BY", opts.by);
    }
    if (opts?.limit) {
      args.push("LIMIT", opts.limit.offset, opts.limit.count);
    }
    if (opts?.patterns) {
      args.push("GET", ...opts.patterns);
    }
    if (opts?.order) {
      args.push(opts.order);
    }
    if (opts?.alpha) {
      args.push("ALPHA");
    }
    if (opts?.destination !== undefined) {
      args.push("STORE", opts.destination);
      return this.execIntegerReply("SORT", ...args);
    }
    return this.execArrayReply<BulkString>("SORT", ...args);
  }

  spop(key: string): Promise<Bulk>;
  spop(key: string, count: number): Promise<BulkString[]>;
  spop(key: string, count?: number) {
    if (count !== undefined) {
      return this.execArrayReply<BulkString>("SPOP", key, count);
    }
    return this.execBulkReply("SPOP", key);
  }

  srandmember(key: string): Promise<Bulk>;
  srandmember(key: string, count: number): Promise<BulkString[]>;
  srandmember(key: string, count?: number) {
    if (count !== undefined) {
      return this.execArrayReply<BulkString>("SRANDMEMBER", key, count);
    }
    return this.execBulkReply("SRANDMEMBER", key);
  }

  srem(key: string, ...members: string[]) {
    return this.execIntegerReply("SREM", key, ...members);
  }

  stralgo(
    algorithm: "LCS",
    target: "KEYS" | "STRINGS",
    a: string,
    b: string,
    opts?: {
      idx?: boolean;
      len?: boolean;
      minmatchlen?: number;
      withmatchlen?: boolean;
    },
  ) {
    const args: (number | string)[] = [];
    if (opts?.idx) {
      args.push("IDX");
    }
    if (opts?.len) {
      args.push("LEN");
    }
    if (opts?.withmatchlen) {
      args.push("WITHMATCHLEN");
    }
    if (opts?.minmatchlen) {
      args.push("MINMATCHLEN");
      args.push(opts.minmatchlen);
    }
    return this.execBulkReply("STRALGO", "LCS", target, a, b, ...args);
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

  swapdb(index1: number, index2: number) {
    return this.execStatusReply("SWAPDB", index1, index2);
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

  watch(...keys: string[]) {
    return this.execStatusReply("WATCH", ...keys);
  }

  xack(key: string, group: string, ...xids: XIdInput[]) {
    return this.execIntegerReply(
      "XACK",
      key,
      group,
      ...xids.map((xid) => xidstr(xid)),
    );
  }

  xadd(
    key: string,
    xid: XIdAdd,
    fieldValues: XAddFieldValues,
    maxlen: XMaxlen | undefined = undefined,
  ) {
    const args: (string | number)[] = [key];

    if (maxlen) {
      args.push("MAXLEN");
      if (maxlen.approx) {
        args.push("~");
      }
      args.push(maxlen.elements.toString());
    }

    args.push(xidstr(xid));

    if (fieldValues instanceof Map) {
      for (const [f, v] of fieldValues) {
        args.push(f);
        args.push(v);
      }
    } else {
      for (const [f, v] of Object.entries(fieldValues)) {
        args.push(f);
        args.push(v);
      }
    }

    return this.execBulkReply<BulkString>(
      "XADD",
      ...args,
    ).then((rawId) => parseXId(rawId));
  }

  xclaim(key: string, opts: XClaimOpts, ...xids: XIdInput[]) {
    const args = [];
    if (opts.idle) {
      args.push("IDLE");
      args.push(opts.idle);
    }

    if (opts.time) {
      args.push("TIME");
      args.push(opts.time);
    }

    if (opts.retryCount) {
      args.push("RETRYCOUNT");
      args.push(opts.retryCount);
    }

    if (opts.force) {
      args.push("FORCE");
    }

    if (opts.justXId) {
      args.push("JUSTID");
    }

    return this.execArrayReply<XReadIdData | BulkString>(
      "XCLAIM",
      key,
      opts.group,
      opts.consumer,
      opts.minIdleTime,
      ...xids.map((xid) => xidstr(xid)),
      ...args,
    ).then((raw) => {
      if (opts.justXId) {
        const xids = [];
        for (const r of raw) {
          if (typeof r === "string") {
            xids.push(parseXId(r));
          }
        }
        const payload: XClaimJustXId = { kind: "justxid", xids };
        return payload;
      }

      const messages = [];
      for (const r of raw) {
        if (typeof r !== "string") {
          messages.push(parseXMessage(r));
        }
      }
      const payload: XClaimMessages = { kind: "messages", messages };
      return payload;
    });
  }

  xdel(key: string, ...xids: XIdInput[]) {
    return this.execIntegerReply(
      "XDEL",
      key,
      ...xids.map((rawId) => xidstr(rawId)),
    );
  }

  xlen(key: string) {
    return this.execIntegerReply("XLEN", key);
  }

  xgroup_create(
    key: string,
    groupName: string,
    xid: XIdInput | "$",
    mkstream?: boolean,
  ) {
    const args = [];
    if (mkstream) {
      args.push("MKSTREAM");
    }

    return this.execStatusReply(
      "XGROUP",
      "CREATE",
      key,
      groupName,
      xidstr(xid),
      ...args,
    );
  }

  xgroup_delconsumer(
    key: string,
    groupName: string,
    consumerName: string,
  ) {
    return this.execIntegerReply(
      "XGROUP",
      "DELCONSUMER",
      key,
      groupName,
      consumerName,
    );
  }

  xgroup_destroy(key: string, groupName: string) {
    return this.execIntegerReply("XGROUP", "DESTROY", key, groupName);
  }

  xgroup_help() {
    return this.execBulkReply<BulkString>("XGROUP", "HELP");
  }

  xgroup_setid(
    key: string,
    groupName: string,
    xid: XId,
  ) {
    return this.execStatusReply(
      "XGROUP",
      "SETID",
      key,
      groupName,
      xidstr(xid),
    );
  }

  xinfo_stream(key: string) {
    return this.execArrayReply<Raw>("XINFO", "STREAM", key).then(
      (raw) => {
        // Note that you should not rely on the fields
        // exact position, nor on the number of fields,
        // new fields may be added in the future.
        const data: Map<string, Raw> = convertMap(raw);

        const firstEntry = parseXMessage(
          data.get("first-entry") as XReadIdData,
        );
        const lastEntry = parseXMessage(
          data.get("last-entry") as XReadIdData,
        );

        return {
          length: rawnum(data.get("length")),
          radixTreeKeys: rawnum(data.get("radix-tree-keys")),
          radixTreeNodes: rawnum(data.get("radix-tree-nodes")),
          groups: rawnum(data.get("groups")),
          lastGeneratedId: parseXId(rawstr(data.get("last-generated-id"))),
          firstEntry,
          lastEntry,
        };
      },
    );
  }

  xinfo_stream_full(key: string, count?: number) {
    const args = [];
    if (count) {
      args.push("COUNT");
      args.push(count);
    }
    return this.execArrayReply<Raw>("XINFO", "STREAM", key, "FULL", ...args)
      .then(
        (raw) => {
          // Note that you should not rely on the fields
          // exact position, nor on the number of fields,
          // new fields may be added in the future.
          if (raw === undefined) throw "no data";

          const data: Map<string, Raw> = convertMap(raw);
          if (data === undefined) throw "no data converted";

          const entries = (data.get("entries") as ConditionalArray).map((
            raw: Raw,
          ) => parseXMessage(raw as XReadIdData));
          return {
            length: rawnum(data.get("length")),
            radixTreeKeys: rawnum(data.get("radix-tree-keys")),
            radixTreeNodes: rawnum(data.get("radix-tree-nodes")),
            lastGeneratedId: parseXId(rawstr(data.get("last-generated-id"))),
            entries,
            groups: parseXGroupDetail(data.get("groups") as ConditionalArray),
          };
        },
      );
  }

  xinfo_groups(key: string) {
    return this.execArrayReply<ConditionalArray>("XINFO", "GROUPS", key).then(
      (raws) =>
        raws.map((raw) => {
          const data = convertMap(raw);
          return {
            name: rawstr(data.get("name")),
            consumers: rawnum(data.get("consumers")),
            pending: rawnum(data.get("pending")),
            lastDeliveredId: parseXId(rawstr(data.get("last-delivered-id"))),
          };
        }),
    );
  }

  xinfo_consumers(key: string, group: string) {
    return this.execArrayReply<ConditionalArray>(
      "XINFO",
      "CONSUMERS",
      key,
      group,
    ).then(
      (raws) =>
        raws.map((raw) => {
          const data = convertMap(raw);
          return {
            name: rawstr(data.get("name")),
            pending: rawnum(data.get("pending")),
            idle: rawnum(data.get("idle")),
          };
        }),
    );
  }

  xpending(
    key: string,
    group: string,
  ) {
    return this.execArrayReply<Raw>("XPENDING", key, group)
      .then((raw) => {
        if (
          isNumber(raw[0]) && isString(raw[1]) &&
          isString(raw[2]) && isCondArray(raw[3])
        ) {
          return {
            count: raw[0],
            startId: parseXId(raw[1]),
            endId: parseXId(raw[2]),
            consumers: parseXPendingConsumers(raw[3]),
          };
        } else {
          throw "parse err";
        }
      });
  }

  xpending_count(
    key: string,
    group: string,
    startEndCount: StartEndCount,
    consumer?: string,
  ) {
    const args = [];
    args.push(startEndCount.start);
    args.push(startEndCount.end);
    args.push(startEndCount.count);

    if (consumer) {
      args.push(consumer);
    }

    return this.execArrayReply<Raw>("XPENDING", key, group, ...args)
      .then((raw) => parseXPendingCounts(raw));
  }

  xrange(
    key: string,
    start: XIdNeg,
    end: XIdPos,
    count?: number,
  ) {
    const args: (string | number)[] = [key, xidstr(start), xidstr(end)];
    if (count) {
      args.push("COUNT");
      args.push(count);
    }
    return this.execArrayReply<XReadIdData>("XRANGE", ...args).then(
      (raw) => raw.map((m) => parseXMessage(m)),
    );
  }

  xrevrange(
    key: string,
    start: XIdPos,
    end: XIdNeg,
    count?: number,
  ) {
    const args: (string | number)[] = [key, xidstr(start), xidstr(end)];
    if (count) {
      args.push("COUNT");
      args.push(count);
    }
    return this.execArrayReply<XReadIdData>("XREVRANGE", ...args).then(
      (raw) => raw.map((m) => parseXMessage(m)),
    );
  }

  xread(
    keyXIds: (XKeyId | XKeyIdLike)[],
    opts?: { count?: number; block?: number },
  ) {
    const args = [];
    if (opts) {
      if (opts.count) {
        args.push("COUNT");
        args.push(opts.count);
      }
      if (opts.block) {
        args.push("BLOCK");
        args.push(opts.block);
      }
    }
    args.push("STREAMS");

    const theKeys = [];
    const theXIds = [];

    for (const a of keyXIds) {
      if (a instanceof Array) {
        // XKeyIdLike
        theKeys.push(a[0]);
        theXIds.push(xidstr(a[1]));
      } else {
        // XKeyId
        theKeys.push(a.key);
        theXIds.push(xidstr(a.xid));
      }
    }

    return this.execArrayReply<XReadStreamRaw>(
      "XREAD",
      ...args.concat(theKeys).concat(theXIds),
    ).then((raw) => parseXReadReply(raw));
  }

  xreadgroup(
    keyXIds: (XKeyIdGroup | XKeyIdGroupLike)[],
    { group, consumer, count, block }: XReadGroupOpts,
  ) {
    const args: (string | number)[] = [
      "GROUP",
      group,
      consumer,
    ];

    if (count) {
      args.push("COUNT");
      args.push(count);
    }
    if (block) {
      args.push("BLOCK");
      args.push(block);
    }

    args.push("STREAMS");

    const theKeys = [];
    const theXIds = [];

    for (const a of keyXIds) {
      if (a instanceof Array) {
        // XKeyIdGroupLike
        theKeys.push(a[0]);
        theXIds.push(a[1] === ">" ? ">" : xidstr(a[1]));
      } else {
        // XKeyIdGroup
        theKeys.push(a.key);
        theXIds.push(a.xid === ">" ? ">" : xidstr(a.xid));
      }
    }

    return this.execArrayReply<XReadStreamRaw>(
      "XREADGROUP",
      ...args.concat(theKeys).concat(theXIds),
    ).then((raw) => parseXReadReply(raw));
  }

  xtrim(key: string, maxlen: XMaxlen) {
    const args = [];
    if (maxlen.approx) {
      args.push("~");
    }

    args.push(maxlen.elements);

    return this.execIntegerReply("XTRIM", key, "MAXLEN", ...args);
  }

  // deno-lint-ignore no-explicit-any
  zadd(key: string, param1: any, param2?: any, opts?: any) {
    const args: (string | number)[] = [key];
    if (Array.isArray(param1)) {
      args.push(...param1.flatMap((e) => e));
      opts = param2;
    } else if (typeof param1 === "object") {
      for (const [member, score] of Object.entries(param1)) {
        args.push(score as number, member);
      }
      opts = param2;
    } else {
      args.push(param1, param2);
    }
    if (opts?.mode) {
      args.push(opts.mode);
    }
    if (opts?.ch) {
      args.push("CH");
    }
    return this.execIntegerReply("ZADD", ...args);
  }

  zadd_incr(
    key: string,
    score: number,
    member: string,
    opts?: { mode?: "NX" | "XX"; ch?: boolean },
  ) {
    const args: (string | number)[] = [key, score, member];
    if (opts?.mode) {
      args.push(opts.mode);
    }
    if (opts?.ch) {
      args.push("CH");
    }
    args.push("INCR");
    return this.execBulkReply("ZADD", ...args);
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
    keys: string[] | [string, number][] | Record<string, number>,
    opts?: { aggregate?: "SUM" | "MIN" | "MAX" },
  ) {
    const args = this.pushZStoreArgs([destination], keys, opts);
    return this.execIntegerReply("ZINTERSTORE", ...args);
  }

  zunionstore(
    destination: string,
    keys: string[] | [string, number][] | Record<string, number>,
    opts?: { aggregate?: "SUM" | "MIN" | "MAX" },
  ) {
    const args = this.pushZStoreArgs([destination], keys, opts);
    return this.execIntegerReply("ZUNIONSTORE", ...args);
  }

  private pushZStoreArgs(
    args: (number | string)[],
    keys: string[] | [string, number][] | Record<string, number>,
    opts?: { aggregate?: "SUM" | "MIN" | "MAX" },
  ) {
    if (Array.isArray(keys)) {
      args.push(keys.length);
      if (Array.isArray(keys[0])) {
        keys = keys as [string, number][];
        args.push(...keys.map((e) => e[0]));
        args.push("WEIGHTS");
        args.push(...keys.map((e) => e[1]));
      } else {
        args.push(...(keys as string[]));
      }
    } else {
      args.push(Object.keys(keys).length);
      args.push(...Object.keys(keys));
      args.push("WEIGHTS");
      args.push(...Object.values(keys));
    }
    if (opts?.aggregate) {
      args.push("AGGREGATE", opts.aggregate);
    }
    return args;
  }

  zlexcount(key: string, min: string, max: string) {
    return this.execIntegerReply("ZLEXCOUNT", key, min, max);
  }

  zpopmax(key: string, count?: number) {
    if (count !== undefined) {
      return this.execArrayReply<BulkString>("ZPOPMAX", key, count);
    }
    return this.execArrayReply<BulkString>("ZPOPMAX", key);
  }

  zpopmin(key: string, count?: number) {
    if (count !== undefined) {
      return this.execArrayReply<BulkString>("ZPOPMIN", key, count);
    }
    return this.execArrayReply<BulkString>("ZPOPMIN", key);
  }

  zrange(
    key: string,
    start: number,
    stop: number,
    opts?: { with_score?: boolean },
  ) {
    const args = this.pushZRangeOpts([key, start, stop], opts);
    return this.execArrayReply<BulkString>("ZRANGE", ...args);
  }

  zrangebylex(
    key: string,
    min: string,
    max: string,
    opts?: { limit?: { offset: number; count: number } },
  ) {
    const args = this.pushZRangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZRANGEBYLEX", ...args);
  }

  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    opts?: { with_score?: boolean; limit?: { offset: number; count: number } },
  ) {
    const args = this.pushZRangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZRANGEBYSCORE", ...args);
  }

  zrank(key: string, member: string) {
    return this.execIntegerOrNilReply("ZRANK", key, member);
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

  zremrangebyscore(key: string, min: number | string, max: number | string) {
    return this.execIntegerReply("ZREMRANGEBYSCORE", key, min, max);
  }

  zrevrange(
    key: string,
    start: number,
    stop: number,
    opts?: { with_score?: boolean },
  ) {
    const args = this.pushZRangeOpts([key, start, stop], opts);
    return this.execArrayReply<BulkString>("ZREVRANGE", ...args);
  }

  zrevrangebylex(
    key: string,
    max: string,
    min: string,
    opts?: { limit?: { offset: number; count: number } },
  ) {
    const args = this.pushZRangeOpts([key, min, max], opts);
    return this.execArrayReply<BulkString>("ZREVRANGEBYLEX", ...args);
  }

  zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    opts?: { with_score?: boolean; limit?: { offset: number; count: number } },
  ) {
    const args = this.pushZRangeOpts([key, max, min], opts);
    return this.execArrayReply<BulkString>("ZREVRANGEBYSCORE", ...args);
  }

  private pushZRangeOpts(
    args: (number | string)[],
    opts?: { with_score?: boolean; limit?: { offset: number; count: number } },
  ) {
    if (opts?.with_score) {
      args.push("WITHSCORES");
    }
    if (opts?.limit) {
      args.push("LIMIT", opts.limit.offset, opts.limit.count);
    }
    return args;
  }

  zrevrank(key: string, member: string) {
    return this.execIntegerOrNilReply("ZREVRANK", key, member);
  }

  zscore(key: string, member: string) {
    return this.execBulkReply("ZSCORE", key, member);
  }

  scan(
    cursor: number,
    opts?: { pattern?: string; count?: number; type?: string },
  ) {
    const args = this.pushScanOpts([cursor], opts);
    return this.execArrayReply("SCAN", ...args) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  sscan(
    key: string,
    cursor: number,
    opts?: { pattern?: string; count?: number },
  ) {
    const args = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("SSCAN", ...args) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  hscan(
    key: string,
    cursor: number,
    opts?: { pattern?: string; count?: number },
  ) {
    const args = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("HSCAN", ...args) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  zscan(
    key: string,
    cursor: number,
    opts?: { pattern?: string; count?: number },
  ) {
    const args = this.pushScanOpts([key, cursor], opts);
    return this.execArrayReply("ZSCAN", ...args) as Promise<
      [BulkString, BulkString[]]
    >;
  }

  private pushScanOpts(
    args: (number | string)[],
    opts?: { pattern?: string; count?: number; type?: string },
  ) {
    if (opts?.pattern !== undefined) {
      args.push("MATCH", opts.pattern);
    }
    if (opts?.count !== undefined) {
      args.push("COUNT", opts.count);
    }
    if (opts?.type !== undefined) {
      args.push("TYPE", opts.type);
    }
    return args;
  }

  tx() {
    return createRedisPipeline(this.connection, true);
  }

  pipeline() {
    return createRedisPipeline(this.connection);
  }
}

export type RedisConnectOptions = {
  hostname: string;
  port?: number | string;
  tls?: boolean;
  db?: number;
  password?: string;
  name?: string;
  maxRetryCount?: number;
  retryInterval?: number;
};

/**
 * Connect to Redis server
 * @param options
 * @example
 *  const conn = connect({hostname: "127.0.0.1", port: 6379}) // -> TCP, 127.0.0.1:6379
 *  const conn = connect({hostname: "redis.proxy", port: 443, tls: true}) // -> TLS, redis.proxy:443
 */
export async function connect(options: RedisConnectOptions): Promise<Redis> {
  const { hostname, port = 6379, ...opts } = options;
  const connection = new RedisConnection(hostname, port, opts);
  await connection.connect();
  const executor = new MuxExecutor(connection);
  return new RedisImpl(connection, executor);
}
