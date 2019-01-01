import {Buffer, Conn, dial} from "deno"
import {BufReader, BufWriter} from "http://deno.land/x/net/bufio.ts";
import {ConnectionClosedError} from "./errors.ts";

export type Redis = {
    append(key: string, value: string): Promise<number>
    auth(password: string): Promise<string>
    bgrewriteaof(): Promise<string>
    bgsave(): Promise<string>
    bitcount(key: string): Promise<number>
    bitcount(key: string, start: number, end: number): Promise<number>
    bitfield(): Promise<string[]>
    bitop(operation, destkey: string, ...keys: string[]): Promise<number>
    bitpos(key: string, bit: number, start?: number, end?: number): Promise<number>
    blpop(key: string | string[], timeout: number): Promise<string[]>
    brpop(key: string | string[], timeout: number): Promise<string[]>
    brpoplpush(source: string, destination: string, timeout: number): Promise<string>
    bzpopmin(key: string | string[], timeout: number): Promise<string[]>
    bzpopmax(key: string | string[], timeout: number): Promise<string[]>
    command(): Promise<string[]>
    command_count(): Promise<number>
    command_getkeys(): Promise<string[]>
    command_info(...command_names: string[]): Promise<string[]>
    config_get(parameter: string): Promise<string[]>
    config_rewrite(): Promise<string>
    config_set(parameter: string, value: string): Promise<string>
    config_resetstat(): Promise<string>
    dbsize(): Promise<number>
    debug_object(key: string): Promise<string>
    debug_segfault(): Promise<string>
    decr(key: string): Promise<number>
    decrby(key: string, decrement: number): Promise<number>
    del(...keys: string[]): Promise<number>
    discard(): Promise<string>
    dump(key: string): Promise<string>
    echo(message: string): Promise<string>
    eval(script: string, key: string, arg: string)
    eval(script: string, keys: string[], args: string[])
    evalsha(sha1: string, key: string, arg: string)
    evalsha(sha1: string, keys: string[], args: string[])
    exec(): Promise<string[]>
    exists(...keys: string[]): Promise<number>
    expire(key: string, seconds: number): Promise<number>
    expireat(key: string, timestamp: string): Promise<number>
    flushall(async?: boolean): Promise<string>
    flushdb(async?: boolean): Promise<string>
    // Geo
    geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number>
    geoadd(key: string, ...longitude_latitude_member: [number | number | string][]): Promise<number>
    geohash(key: string, ...members: string[]): Promise<string[]>
    geopos(key: string, ...members: string[]): Promise<string[]>
    geodist(key: string, member1: string, member2: string, unit?: "m" | "km" | "ft" | "mi"): Promise<string>
    georadius(
        key: string,
        longitude: number,
        latitude: number,
        radius: number,
        unit: "m" | "km" | "ft" | "mi",
        opts?: {
            withCoord?: boolean,
            withDist?: boolean,
            withHash?: boolean,
            count?: number,
            sort?: "ASC" | "DESC",
            store?: string,
            storeDist?: string,
        }
    )
    georadiusbymember(
        key: string,
        member: string,
        radius: number,
        unit: "m" | "km" | "ft" | "mi",
        opts?: {
            withCoord?: boolean,
            withDist?: boolean,
            withHash?: boolean,
            count?: number,
            sort?: "ASC" | "DESC",
            store?: string,
            storeDist?: string,
        }
    )
    get(key: string): Promise<string>
    getbit(key: string, offset: number): Promise<number>
    getrange(key: string, start: number, end: number): Promise<string>
    getset(key: string, value: string): Promise<string>
    // Hash
    hdel(key: string, ...fields: string[]): Promise<number>
    hexists(key: string, field: string): Promise<number>
    hget(key: string, field: string): Promise<string>
    hgetall(key: string): Promise<string[]>
    hincrby(key: string, field: string, increment: number): Promise<number>
    hincrbyfloat(key: string, field: string, increment: number): Promise<string>
    hkeys(key: string): Promise<string[]>
    hlen(key: string): Promise<number>
    hmget(key: string, ...fields: string[]): Promise<string[]>
    hmset(key: string, field: string, value: string): Promise<string>
    hmset(key: string, ...field_values: string[]): Promise<string>
    hset(key: string, field: string, value: string): Promise<number>
    hsetnx(key: string, field: string, value: string): Promise<number>
    hstrlen(key: string, field: string): Promise<number>
    hvals(key: string): Promise<string[]>
    // String
    incr(key: string): Promise<number>
    incrby(key: string, increment: number): Promise<number>
    incrbyfloat(key: string, increment: number): Promise<string>
    info(section?: string): Promise<string>
    keys(pattern: string): Promise<string[]>
    lastsave(): Promise<number>
    lindex(key: string, index: number): Promise<string>
    linsert(key: string, loc: "BEFORE" | "AFTER", pivot: string, value: string): Promise<number>
    llen(key: string): Promise<number>
    lpop(key: string): Promise<string>
    lpush(key: string, ...values: string[]): Promise<number>
    lpushx(key: string, value: string): Promise<number>
    lrange(key: string, start: number, stop: number): Promise<string[]>
    lrem(key: string, count: number, value: string): Promise<number>
    lset(key: string, index: number, value: string): Promise<string>
    ltrim(key: string, start: number, stop: number): Promise<string>
    memory_doctor(): Promise<string>
    memory_help(): Promise<string[]>
    memory_malloc_stats(): Promise<string>
    memory_purge(): Promise<string>
    memory_stats(): Promise<string[]>
    memory_usage(key: string, SAMPLES?, count?: number): Promise<number>
    mget(...keys: string[]): Promise<string[]>
    migrate(host: string, port: number | string, key: string, destination_db: string, timeout: number, opts?: {
        copy?: boolean,
        replace?: boolean,
        keys?: string[]
    }): Promise<string>
    monitor()
    move(key: string, db: string): Promise<number>
    mset(key: string, value: string): Promise<string>
    mset(...key_values: string[]): Promise<string>
    msetnx(key: string, value: string): Promise<number>
    msetnx(...key_values: string[]): Promise<number>
    multi(): Promise<string>
    object<T extends ("REFCOUNT" | "ENCODING" | "IDLETIME" | "FREQ" | "HELP")>(subcommand, arg?: string): Promise<{
        REFCOUNT: number,
        ENCODING: string,
        IDLETIME: number,
        FREQ: string,
        HELP: string,
    }[T]>
    persist(key: string): Promise<number>
    pexpire(key: string, milliseconds: number): Promise<number>
    pexpireat(key: string, milliseconds_timestamp: number): Promise<number>
    pfadd(key: string, ...elements: string[]): Promise<number>
    pfcount(...keys: string[]): Promise<number>
    pfmerge(destkey: string, ...sourcekeys: string[]): Promise<string>
    ping(message?: string): Promise<string>
    psetex(key: string, milliseconds: number, value: string)
    psubscribe(...patterns: string[])
    pubsub<T extends ("CHANNELS" | "NUMSUBS" | "NUMPAT")>(
        subcommand: T, args: {
            CHANNELS: string,
            NUMSUBS: string[],
            NUMPAT: number
        }[T]): {
        CHANNELS: Promise<string[]>,
        NUMSUBS: Promise<string[]>,
        NUMPAT: Promise<number>
    }[T]
    pttl(key: string): Promise<number>
    publish(channel: string, message: string): Promise<number>
    punsubscribe(...patterns: string[])
    quit(): Promise<string>
    randomkey(): Promise<string>
    readonly(): Promise<string>
    readwrite(): Promise<string>
    rename(key: string, newkey: string): Promise<string>
    renamenx(key: string, newkey: string): Promise<number>
    restore(key: string, ttl: number, serialized_value: string, replace?: boolean): Promise<string>
    role(): Promise<string[]>
    rpop(key: string): Promise<string>
    rpoplpush(source: string, destination: string): Promise<string>
    rpush(key: string, ...values: string[]): Promise<number>
    rpushx(key: string, value: string): Promise<number>
    sadd(key: string, ...members: string[]): Promise<number>
    save(): Promise<string>
    scard(key: string): Promise<number>
    script_debug(arg: "YES" | "SYNC" | "NO"): Promise<string>
    script_exists(...sha1s: string[]): Promise<string[]>
    script_flush(): Promise<string>
    script_kill(): Promise<string>
    script_load(script: string): Promise<string>
    sdiff(...keys: string[]): Promise<string[]>
    sdiffstore(destination: string, ...keys: string[]): Promise<number>
    select(index: number): Promise<string>
    set(key: string, value: string, opts?: {
        ex?: number
        px?: number
        mode?: "NX" | "XX",
    }): Promise<string>;
    setbit(key: string, offset: number, value: string): Promise<number>
    setex(key: string, seconds: number, value: string): Promise<string>
    setnx(key: string, value: string): Promise<number>
    setrange(key: string, offset: number, value: string): Promise<number>
    shutdown(arg: "NOSAVE" | "SAVE?"): Promise<string>
    sinter(...keys: string[]): Promise<string[]>
    sinterstore(destination: string, ...keys: string[]): Promise<number>
    sismember(key: string, member: string): Promise<number>
    slaveof(host: string, port: string | number): Promise<string>
    replicaof(host: string, port: string | number): Promise<string>
    slowlog(subcommand: string, ...argument: string[])
    smembers(key: string): Promise<string[]>
    smove(source: string, destination: string, member: string): Promise<number>
    sort(key: string, opts?: {
        by?: string,
        offset?: number,
        count?: number,
        patterns?: string[]
        order: "ASC" | "DESC",
        alpha?: boolean,
        destination?: string
    }): Promise<string[] | number>
    spop(key: string, count?: number): Promise<string>
    srandmember(key: string, count?: number): Promise<string>
    srem(key: string, ...members: string[]): Promise<number>
    strlen(key: string): Promise<number>
    subscribe(...channels: string[])
    sunion(...keys: string[]): Promise<string[]>
    sunionstore(destination, ...keys: string[]): Promise<number>
    swapdb(index, index2): Promise<string>
    sync()
    time(): Promise<string[]>
    touch(...keys: string[]): Promise<number>
    ttl(key: string): Promise<number>
    type(key: string): Promise<string>
    unsubscribe(...channels: string[])
    unlink(...keys: string[]): Promise<number>
    unwatch(): Promise<string>
    wait(numreplicas: number, timeout: number): Promise<number>
    watch(...keys: string[]): Promise<string>
    zadd(key: string,
         score: number,
         member: string,
         opts?: {
             nxx?: "NX" | "XX",
             ch?: boolean,
             incr?: boolean,
         }): Promise<number>
    zadd(key: string,
         score_members: (number | string)[],
         opts?: {
             nxx?: "NX" | "XX",
             ch?: boolean,
             incr?: boolean,
         }): Promise<number>
    zcard(key: string): Promise<number>
    zcount(key: string, min: number, max: number): Promise<number>
    zincrby(key: string, increment, member: string): Promise<string>
    zinterstore(destination: string, numkeys: number, keys: string | string[], weights?: number | number[], aggregate?: "SUM" | "MIN" | "MAX"): Promise<number>
    zlexcount(key: string, min: number, max: number): Promise<number>
    zpopmax(key: string, count?: number): Promise<string[]>
    zpopmin(key: string, count?: number): Promise<string[]>
    zrange(key: string, start: number, stop: number, WITHSCORES?): Promise<string[]>
    zrangebylex(key: string, min: number, max: number, LIMIT?, offset?: number, count?: number): Promise<string[]>
    zrevrangebylex(key: string, max: number, min: number, LIMIT?, offset?: number, count?: number): Promise<string[]>
    zrangebyscore(key: string, min: number, max: number, WITHSCORES?, LIMIT?, offset?: number, count?: number): Promise<string[]>
    zrank(key: string, member: string): Promise<number | undefined>
    zrem(key: string, member: string, ...members: string[]): Promise<number>
    zremrangebylex(key: string, min: number, max: number): Promise<number>
    zremrangebyrank(key: string, start: number, stop: number): Promise<number>
    zremrangebyscore(key: string, min: number, max: number): Promise<number>
    zrevrange(key: string, start: number, stop: number, WITHSCORES?): Promise<string[]>
    zrevrangebyscore(key: string, max: number, min: number, WITHSCORES?, LIMIT?, offset?: number, count?: number): Promise<string[]>
    zrevrank(key: string, member: string): Promise<number | undefined>
    zscore(key: string, member: string): Promise<string>
    zunionstore(destination: string, numkeys: string, keys: string | string[], weights?: number | number[], aggregate?: "SUM" | "MIN" | "MAX"): Promise<number>
    // scan
    scan(cursor: number, opts?: {
        pattern?: string,
        count?: number
    })
    hscan(key: string, cursor: number, opts?: {
        pattern?: string,
        count?: number
    })
    sscan(key: string, cursor: number, opts?: {
        pattern?: string,
        count?: number
    })
    zscan(key: string, cursor: number, opts?: {
        pattern?: string
    })

    readonly isClosed: boolean;
    close()
}

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);
const SimpleStringCode = "+".charCodeAt(0);
const ArrayReplyCode = "*".charCodeAt(0);
const ErrorReplyCode = "-".charCodeAt(0);

class RedisImpl implements Redis {
    writer: BufWriter;
    reader: BufReader;
    _isClosed = false;
    get isClosed() {
        return this._isClosed;
    }

    constructor(private readonly conn: Conn) {
        this.writer = new BufWriter(conn);
        this.reader = new BufReader(conn);
    }

    private async execRawReply<T extends "I" | "S" | "B" | "A">(command: string, ...args: (string | number)[]): Promise<{
        I: number,
        S: string,
        B: string | undefined,
        A: any[]
    }[T]> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        const [b] = await this.reader.peek(1);
        switch (b[0]) {
            case IntegerReplyCode:
                return readIntegerReply(this.reader);
            case SimpleStringCode:
                return readStatusReply(this.reader);
            case BulkReplyCode:
                return readBulkReply(this.reader);
            case ArrayReplyCode:
                return readArrayReply(this.reader);
            case ErrorReplyCode:
                tryParseErrorReply(await readLine(this.reader))
        }
    }

    private async execStatusReply(command: string, ...args: (string | number)[]): Promise<string> {
        return this.execRawReply<"S">(command, ...args);
    }

    private async execIntegerReply(command: string, ...args: (string | number)[]): Promise<number> {
        return this.execRawReply<"I">(command, ...args);
    }

    private async execBulkReply(command: string, ...args: (string | number)[]): Promise<string> {
        return this.execRawReply<"B">(command, ...args);
    }

    private async execIntegerOrNilReply(command: string, ...args: (string | number)[]): Promise<number | undefined> {
        return this.execRawReply(command, ...args) as Promise<number | undefined>;
    }

    private async execArrayReply(command: string, ...args: (string | number)[]): Promise<any[]> {
        return this.execRawReply<"A">(command, ...args)
    }

    append(key, value) {
        return this.execIntegerReply("APPEND", key, value)
    }

    auth(password) {
        return this.execBulkReply("AUTH", password)
    }

    bgrewriteaof() {
        return this.execBulkReply("BGREWRITEAOF",)
    }

    bgsave() {
        return this.execBulkReply("BGSAVE",)
    }

    bitcount(key, start?, end?) {
        return this.execIntegerReply("BITCOUNT", key, start, end)
    }

    bitfield() {
        return this.execArrayReply("BITFIELD",)
    }

    bitop(operation, destkey, ...keys) {
        return this.execIntegerReply("BITOP", operation, destkey, ...keys)
    }

    bitpos(key, bit, start?, end?) {
        return this.execIntegerReply("BITPOS", key, bit, start, end)
    }

    blpop(keys, timeout) {
        if (typeof keys === "string") {
            return this.execArrayReply("BLPOP", keys, timeout)
        } else {
            return this.execArrayReply("BLPOP", ...keys, timeout)
        }
    }

    brpop(keys, timeout) {
        if (typeof keys === "string") {
            return this.execArrayReply("BRPOP", keys, timeout)
        } else {
            return this.execArrayReply("BRPOP", ...keys, timeout)
        }
    }

    brpoplpush(source, destination, timeout) {
        return this.execStatusReply("BRPOPLPUSH", source, destination, timeout)
    }

    bzpopmin(keys, timeout) {
        if (typeof keys === "string") {
            return this.execArrayReply("BZPOPMIN", keys, timeout)
        } else {
            return this.execArrayReply("BZPOPMIN", ...keys, timeout)
        }
    }

    bzpopmax(keys, timeout) {
        if (typeof keys === "string") {
            return this.execArrayReply("BZPOPMAX", keys, timeout)
        } else {
            return this.execArrayReply("BZPOPMAX", ...keys, timeout)
        }
    }

    command() {
        return this.execArrayReply("COMMAND",)
    }

    command_count() {
        return this.execIntegerReply("COMMAND_COUNT",)
    }

    command_getkeys() {
        return this.execArrayReply("COMMAND_GETKEYS",)
    }

    command_info(command_name, ...command_names) {
        return this.execArrayReply("COMMAND_INFO", command_name, ...command_names)
    }

    config_get(parameter) {
        return this.execArrayReply("CONFIG_GET", parameter)
    }

    config_rewrite() {
        return this.execBulkReply("CONFIG_REWRITE",)
    }

    config_set(parameter, value) {
        return this.execBulkReply("CONFIG_SET", parameter, value)
    }

    config_resetstat() {
        return this.execBulkReply("CONFIG_RESETSTAT",)
    }

    dbsize() {
        return this.execIntegerReply("DBSIZE",)
    }

    debug_object(key) {
        return this.execBulkReply("DEBUG_OBJECT", key)
    }

    debug_segfault() {
        return this.execBulkReply("DEBUG_SEGFAULT",)
    }

    decr(key) {
        return this.execIntegerReply("DECR", key)
    }

    decrby(key, decrement) {
        return this.execIntegerReply("DECRBY", key, decrement)
    }

    del(key, ...keys) {
        return this.execIntegerReply("DEL", key, ...keys)
    }

    discard() {
        return this.execBulkReply("DISCARD",)
    }

    dump(key) {
        return this.execStatusReply("DUMP", key)
    }

    echo(message) {
        return this.execStatusReply("ECHO", message)
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
        return this.execArrayReply("EXEC",)
    }

    exists(key, ...keys) {
        return this.execIntegerReply("EXISTS", key, ...keys)
    }

    expire(key, seconds) {
        return this.execIntegerReply("EXPIRE", key, seconds)
    }

    expireat(key, timestamp) {
        return this.execIntegerReply("EXPIREAT", key, timestamp)
    }

    flushall(async) {
        const args = async ? ["ASYNC"] : [];
        return this.execBulkReply("FLUSHALL", ...args)
    }

    flushdb(async) {
        const args = async ? ["ASYNC"] : [];
        return this.execBulkReply("FLUSHDB", ...args)
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
        return this.execIntegerReply("GEOADD", key, ..._args)
    }

    geohash(key, ...members) {
        return this.execArrayReply("GEOHASH", key, ...members)
    }

    geopos(key, ...members) {
        return this.execArrayReply("GEOPOS", key, ...members)
    }

    geodist(key, member1, member2, unit?) {
        return this.execStatusReply("GEODIST", key, member1, member2, unit)
    }

    georadius(key, longitude, latitude, radius, unit, opts?) {
        const args = this.pushGeoRadiusOpts([key, longitude, latitude, radius, unit], opts);
        return this.execArrayReply("GEORADIUS", ...args)
    }

    georadiusbymember(key, member, radius, unit, opts?) {
        const args = this.pushGeoRadiusOpts([key, member, radius, unit], opts);
        return this.execArrayReply("GEORADIUSBYMEMBER", ...args)
    }

    private pushGeoRadiusOpts(args: (string | number)[], opts) {
        if (!opts) return args;
        if (opts.withCoord) {
            args.push("WITHCOORD")
        }
        if (opts.withDist) {
            args.push("WITHDIST")
        }
        if (opts.withHash) {
            args.push("WITHHASH")
        }
        if (typeof opts.count === "number") {
            args.push(opts.count);
        }
        if (opts.sort === "ASC" || opts.sort === "DESC") {
            args.push(opts.sort)
        }
        if (typeof opts.store === "string") {
            args.push(opts.store)
        }
        if (typeof opts.storeDist === "string") {
            args.push(opts.storeDist)
        }
        return args;
    }

    get(key) {
        return this.execStatusReply("GET", key)
    }

    getbit(key, offset) {
        return this.execIntegerReply("GETBIT", key, offset)
    }

    getrange(key, start, end) {
        return this.execStatusReply("GETRANGE", key, start, end)
    }

    getset(key, value) {
        return this.execStatusReply("GETSET", key, value)
    }

    hdel(key, field, ...fields) {
        return this.execIntegerReply("HDEL", key, field, ...fields)
    }

    hexists(key, field) {
        return this.execIntegerReply("HEXISTS", key, field)
    }

    hget(key, field) {
        return this.execStatusReply("HGET", key, field)
    }

    hgetall(key) {
        return this.execArrayReply("HGETALL", key)
    }

    hincrby(key, field, increment) {
        return this.execIntegerReply("HINCRBY", key, field, increment)
    }

    hincrbyfloat(key, field, increment) {
        return this.execStatusReply("HINCRBYFLOAT", key, field, increment)
    }

    hkeys(key) {
        return this.execArrayReply("HKEYS", key)
    }

    hlen(key) {
        return this.execIntegerReply("HLEN", key)
    }

    hmget(key, ...fields) {
        return this.execArrayReply("HMGET", key, ...fields)
    }

    hmset(key, ...field_values) {
        return this.execBulkReply("HMSET", key, ...field_values)
    }

    hset(key, field, value) {
        return this.execIntegerReply("HSET", key, field, value)
    }

    hsetnx(key, field, value) {
        return this.execIntegerReply("HSETNX", key, field, value)
    }

    hstrlen(key, field) {
        return this.execIntegerReply("HSTRLEN", key, field)
    }

    hvals(key) {
        return this.execArrayReply("HVALS", key)
    }

    incr(key) {
        return this.execIntegerReply("INCR", key)
    }

    incrby(key, increment) {
        return this.execIntegerReply("INCRBY", key, increment)
    }

    incrbyfloat(key, increment) {
        return this.execStatusReply("INCRBYFLOAT", key, increment)
    }

    info(section?) {
        return this.execStatusReply("INFO", section)
    }

    keys(pattern) {
        return this.execArrayReply("KEYS", pattern)
    }

    lastsave() {
        return this.execIntegerReply("LASTSAVE",)
    }

    lindex(key, index) {
        return this.execStatusReply("LINDEX", key, index)
    }

    linsert(key, arg: "BEFORE" | "AFTER", pivot, value) {
        return this.execIntegerReply("LINSERT", key, arg)
    }

    llen(key) {
        return this.execIntegerReply("LLEN", key)
    }

    lpop(key) {
        return this.execStatusReply("LPOP", key)
    }

    lpush(key, ...values) {
        return this.execIntegerReply("LPUSH", key, ...values)
    }

    lpushx(key, value) {
        return this.execIntegerReply("LPUSHX", key, value)
    }

    lrange(key, start, stop) {
        return this.execArrayReply("LRANGE", key, start, stop)
    }

    lrem(key, count, value) {
        return this.execIntegerReply("LREM", key, count, value)
    }

    lset(key, index, value) {
        return this.execBulkReply("LSET", key, index, value)
    }

    ltrim(key, start, stop) {
        return this.execBulkReply("LTRIM", key, start, stop)
    }

    memory_doctor() {
        return this.execStatusReply("MEMORY_DOCTOR",)
    }

    memory_help() {
        return this.execArrayReply("MEMORY_HELP",)
    }

    memory_malloc_stats() {
        return this.execStatusReply("MEMORY_MALLOC_STATS",)
    }

    memory_purge() {
        return this.execBulkReply("MEMORY_PURGE",)
    }

    memory_stats() {
        return this.execArrayReply("MEMORY_STATS",)
    }

    memory_usage(key, SAMPLES?, count?) {
        return this.execIntegerReply("MEMORY_USAGE", key, SAMPLES, count)
    }

    mget(...keys) {
        return this.execArrayReply("MGET", ...keys)
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
        return this.execIntegerReply("MOVE", key, db)
    }

    mset(...key_values) {
        return this.execBulkReply("MSET", ...key_values)
    }

    msetnx(...key_values) {
        return this.execIntegerReply("MSETNX", ...key_values)
    }

    multi() {
        return this.execBulkReply("MULTI",)
    }

    object(subcommand, arg?) {
        switch (subcommand) {
            case "REFCOUNT":
            case "IDLETIME":
                return this.execIntegerReply("OBJECT", subcommand, arg);
            case "ENCODING":
            case "FREQ":
                return this.execBulkReply("OBJECT", subcommand, arg);
            case "HELP":
                return this.execBulkReply("OBJECT", subcommand);
        }
    }

    persist(key) {
        return this.execIntegerReply("PERSIST", key)
    }

    pexpire(key, milliseconds) {
        return this.execIntegerReply("PEXPIRE", key, milliseconds)
    }

    pexpireat(key, milliseconds_timestamp) {
        return this.execIntegerReply("PEXPIREAT", key, milliseconds_timestamp)
    }

    pfadd(key, element, ...elements) {
        return this.execIntegerReply("PFADD", key, element, ...elements)
    }

    pfcount(key, ...keys) {
        return this.execIntegerReply("PFCOUNT", key, ...keys)
    }

    pfmerge(destkey, ...sourcekeys) {
        return this.execBulkReply("PFMERGE", destkey, ...sourcekeys)
    }

    ping(message?) {
        return this.execBulkReply("PING", message)
    }

    psetex(key, milliseconds, value) {
        //
    }

    psubscribe(...patterns) {
        //
    }

    pubsub<T>(subcommand, args) {
        switch (subcommand) {
            case "CHANNELS":
                return this.execArrayReply("PUBSUB", args);
            case "NUMSUBS":
                return this.execArrayReply("PUBSUB", ...args);
            case "NUMPAT":
                return this.execIntegerReply("PUBSUB", args);
        }
    }

    pttl(key) {
        return this.execIntegerReply("PTTL", key)
    }

    publish(channel, message) {
        return this.execIntegerReply("PUBLISH", channel, message)
    }

    punsubscribe(...patterns) {
        return this.execArrayReply("PUNSUBSCRIBE", ...patterns)
    }

    quit() {
        return this.execBulkReply("QUIT",)
    }

    randomkey() {
        return this.execStatusReply("RANDOMKEY",)
    }

    readonly() {
        return this.execBulkReply("READONLY",)
    }

    readwrite() {
        return this.execBulkReply("READWRITE",)
    }

    rename(key, newkey) {
        return this.execBulkReply("RENAME", key, newkey)
    }

    renamenx(key, newkey) {
        return this.execIntegerReply("RENAMENX", key, newkey)
    }

    restore(key, ttl, serialized_value, REPLACE?) {
        const args = [key, ttl, serialized_value];
        if (REPLACE) {
            args.push("REPLACE");
        }
        return this.execBulkReply("RESTORE", ...args);
    }

    role() {
        return this.execArrayReply("ROLE",)
    }

    rpop(key) {
        return this.execStatusReply("RPOP", key)
    }

    rpoplpush(source, destination) {
        return this.execStatusReply("RPOPLPUSH", source, destination)
    }

    rpush(key, ...values) {
        return this.execIntegerReply("RPUSH", key, ...values)
    }

    rpushx(key, value) {
        return this.execIntegerReply("RPUSHX", key, value)
    }

    sadd(key, member, ...members) {
        return this.execIntegerReply("SADD", key, member, ...members)
    }

    save() {
        return this.execBulkReply("SAVE",)
    }

    scard(key) {
        return this.execIntegerReply("SCARD", key)
    }

    script_debug(arg: "YES" | "SYNC" | "NO") {
        return this.execBulkReply("SCRIPT_DEBUG", arg)
    }

    script_exists(sha1, ...sha1s) {
        return this.execArrayReply("SCRIPT_EXISTS", sha1, ...sha1s)
    }

    script_flush() {
        return this.execBulkReply("SCRIPT_FLUSH",)
    }

    script_kill() {
        return this.execBulkReply("SCRIPT_KILL",)
    }

    script_load(script) {
        return this.execStatusReply("SCRIPT_LOAD", script)
    }

    sdiff(key, ...keys) {
        return this.execArrayReply("SDIFF", key, ...keys)
    }

    sdiffstore(destination, key, ...keys) {
        return this.execIntegerReply("SDIFFSTORE", destination, key, ...keys)
    }

    select(index) {
        return this.execBulkReply("SELECT", index)
    }

    set(key, value, opts?) {
        const args = [key, value];
        if (opts) {
            if (opts.ex) {
                args.push("EX", opts.ex);
            } else if (opts.px) {
                args.push("PX", opts.px)
            }
            if (opts.mode) {
                args.push(opts.mode);
            }
        }
        return this.execBulkReply("SET", ...args);
    }


    setbit(key, offset, value) {
        return this.execIntegerReply("SETBIT", key, offset, value)
    }

    setex(key, seconds, value) {
        return this.execBulkReply("SETEX", key, seconds, value)
    }

    setnx(key, value) {
        return this.execIntegerReply("SETNX", key, value)
    }

    setrange(key, offset, value) {
        return this.execIntegerReply("SETRANGE", key, offset, value)
    }

    shutdown(arg: "NOSAVE" | "SAVE?") {
        return this.execBulkReply("SHUTDOWN", arg)
    }

    sinter(key, ...keys) {
        return this.execArrayReply("SINTER", key, ...keys)
    }

    sinterstore(destination, key, ...keys) {
        return this.execIntegerReply("SINTERSTORE", destination, key, ...keys)
    }

    sismember(key, member) {
        return this.execIntegerReply("SISMEMBER", key, member)
    }

    slaveof(host, port) {
        return this.execBulkReply("SLAVEOF", host, port)
    }

    replicaof(host, port) {
        return this.execBulkReply("REPLICAOF", host, port)
    }

    slowlog(subcommand, ...argument) {
        return this.execRawReply("SLOWLOG", subcommand, ...argument)
    }

    smembers(key) {
        return this.execArrayReply("SMEMBERS", key)
    }

    smove(source, destination, member) {
        return this.execIntegerReply("SMOVE", source, destination, member)
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
                args.push("ALPHA")
            }
            if (opts.order) {
                args.push(opts.order)
            }
            if (opts.destination) {
                args.push("STORE", opts.destination)
            }
        }
        if (opts && opts.destination) {
            return this.execIntegerReply("SORT", ...args);
        } else {
            return this.execArrayReply("SORT", ...args);
        }
    }

    spop(...args) {
        return this.execStatusReply("SPOP", ...args)
    }

    srandmember(...args) {
        return this.execStatusReply("SRANDMEMBER", ...args)
    }

    srem(key, ...members) {
        return this.execIntegerReply("SREM", key, ...members)
    }

    strlen(key) {
        return this.execIntegerReply("STRLEN", key)
    }

    subscribe(...channels) {
        return this.execRawReply("SUBSCRIBE", ...channels);
    }

    sunion(...keys) {
        return this.execArrayReply("SUNION", ...keys)
    }

    sunionstore(destination, ...keys) {
        return this.execIntegerReply("SUNIONSTORE", destination, ...keys)
    }

    swapdb(index, index2) {
        return this.execBulkReply("SWAPDB", index, index2)
    }

    sync() {
        //
        throw new Error("not implemented");
    }

    time() {
        return this.execArrayReply("TIME",)
    }

    touch(...keys) {
        return this.execIntegerReply("TOUCH", ...keys)
    }

    ttl(key) {
        return this.execIntegerReply("TTL", key)
    }

    type(key) {
        return this.execBulkReply("TYPE", key)
    }

    unsubscribe(...channels) {
        return this.execArrayReply("UNSUBSCRIBE", ...channels);
    }

    unlink(...keys) {
        return this.execIntegerReply("UNLINK", ...keys)
    }

    unwatch() {
        return this.execBulkReply("UNWATCH",)
    }

    wait(numreplicas, timeout) {
        return this.execIntegerReply("WAIT", numreplicas, timeout)
    }

    watch(key, ...keys) {
        return this.execBulkReply("WATCH", key, ...keys)
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
                args.push(_opts.nxx)
            }
            if (_opts.ch) {
                args.push("CH")
            }
            if (_opts.incr) {
                args.push("INCR")
            }
        }
        return this.execIntegerReply("ZADD", ...args);
    }

    zcard(key) {
        return this.execIntegerReply("ZCARD", key)
    }

    zcount(key, min, max) {
        return this.execIntegerReply("ZCOUNT", key, min, max)
    }

    zincrby(key, increment, member) {
        return this.execStatusReply("ZINCRBY", key, increment, member)
    }

    zinterstore(destination, numkeys, keys, weights?, aggregate?) {
        const args = this.pushZInterStoreArgs([destination, numkeys], keys, weights, aggregate);
        return this.execIntegerReply("ZINTERSTORE", ...args)
    }

    zunionstore(destination: string, numkeys: string, keys: string | string[], weights?: number | number[], aggregate?: "SUM" | "MIN" | "MAX"): Promise<number> {
        const args = this.pushZInterStoreArgs([destination, numkeys], keys, weights, aggregate);
        return this.execIntegerReply("ZUNIONSTORE", ...args);
    }

    private pushZInterStoreArgs(args, keys, weights?, aggregate?) {
        if (typeof keys === "string") {
            args.push(keys)
        } else {
            args.push(...keys)
        }
        if (weights) {
            args.push("WEIGHTS");
            if (typeof weights === "number") {
                args.push(weights);
            } else {
                args.push(...weights)
            }
        }
        if (aggregate) {
            args.push("AGGREGATE");
            args.push(aggregate)
        }
        return args;
    }

    zlexcount(key, min, max) {
        return this.execIntegerReply("ZLEXCOUNT", key, min, max)
    }

    zpopmax(key, count?) {
        return this.execArrayReply("ZPOPMAX", key, count)
    }

    zpopmin(key, count?) {
        return this.execArrayReply("ZPOPMIN", key, count)
    }

    zrange(key, start, stop, WITHSCORES?) {
        return this.execArrayReply("ZRANGE", key, start, stop, WITHSCORES)
    }

    zrangebylex(key, min, max, LIMIT?, offset?, count?) {
        return this.execArrayReply("ZRANGEBYLEX", key, min, max, LIMIT, offset, count)
    }

    zrevrangebylex(key, max, min, LIMIT?, offset?, count?) {
        return this.execArrayReply("ZREVRANGEBYLEX", key, max, min, LIMIT, offset, count)
    }

    zrangebyscore(key, min, max, WITHSCORES?, LIMIT?, offset?, count?) {
        return this.execArrayReply("ZRANGEBYSCORE", key, min, max, WITHSCORES, LIMIT, offset, count)
    }

    zrank(key, member) {
        return this.execIntegerOrNilReply("ZRANK", key, member)
    }

    zrem(key, member, ...members) {
        return this.execIntegerReply("ZREM", key, member, ...members)
    }

    zremrangebylex(key, min, max) {
        return this.execIntegerReply("ZREMRANGEBYLEX", key, min, max)
    }

    zremrangebyrank(key, start, stop) {
        return this.execIntegerReply("ZREMRANGEBYRANK", key, start, stop)
    }

    zremrangebyscore(key, min, max) {
        return this.execIntegerReply("ZREMRANGEBYSCORE", key, min, max)
    }

    zrevrange(key, start, stop, WITHSCORES?) {
        return this.execArrayReply("ZREVRANGE", key, start, stop, WITHSCORES)
    }

    zrevrangebyscore(key, max, min, WITHSCORES?, LIMIT?, offset?, count?) {
        return this.execArrayReply("ZREVRANGEBYSCORE", key, max, min, WITHSCORES, LIMIT, offset, count)
    }

    zrevrank(key, member) {
        return this.execIntegerOrNilReply("ZREVRANK", key, member)
    }

    zscore(key, member) {
        return this.execStatusReply("ZSCORE", key, member)
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

    zscan(key, cursor,opts?) {
        const arg = this.pushScanOpts([key, cursor], opts);
        return this.execArrayReply("ZSCAN", ...arg);

    }

    private pushScanOpts(arg, opts?) {
        if (opts) {
            if (opts.pattern) {
                arg.push("MATCH", opts.pattern)
            }
            if (opts.count !== void 0) {
                arg.push("COUNT", opts.count)
            }
        }
        return arg;
    }


    close() {
        this.conn.close();
    }

}

async function readLine(reader: BufReader): Promise<string> {
    let buf = new Uint8Array(1024);
    let loc = 0;
    while (true) {
        const d = await reader.readByte();
        if (d === '\r'.charCodeAt(0)) {
            const d1 = await reader.readByte();
            if (d1 === '\n'.charCodeAt(0)) {
                buf[loc++] = d;
                buf[loc++] = d1;
                return new Buffer(buf.subarray(0, loc)).toString();
            }
        }
        buf[loc++] = d;
    }
}

export class ErrorReplyError extends Error {
}

export function createRequest(command: string, ...args: (string | number)[]) {
    const _args = args.filter(v => v !== void 0 || v !== null);
    let msg = "";
    msg += `*${1 + _args.length}\r\n`;
    msg += `$${command.length}\r\n`;
    msg += `${command}\r\n`;
    for (const arg of _args) {
        const val = String(arg);
        msg += `$${val.length}\r\n`;
        msg += `${val}\r\n`;
    }
    return msg;
}

const encoder = new TextEncoder();

async function writeRequest(writer: BufWriter, msg: string) {
    await writer.write(encoder.encode(msg));
    await writer.flush();
}

async function readStatusReply(reader: BufReader): Promise<"OK"> {
    const line = await readLine(reader);
    if (line[0] === "+") {
        return line.substr(1, line.length - 3) as "OK"
    }
    tryParseErrorReply(line);
}

async function readIntegerReply(reader: BufReader): Promise<number> {
    const line = await readLine(reader);
    if (line[0] === ":") {
        const str = line.substr(1, line.length - 3);
        return parseInt(str);
    }
    tryParseErrorReply(line);
}

async function readBulkReply(reader: BufReader): Promise<string> {
    const line = await readLine(reader);
    if (line[0] !== "$") {
        tryParseErrorReply(line);
    }
    const sizeStr = line.substr(1, line.length - 3);
    const size = parseInt(sizeStr);
    if (size < 0) {
        // nil bulk reply
        return;
    }
    const dest = new Uint8Array(size + 2);
    await reader.readFull(dest);
    return new Buffer(dest.subarray(0, dest.length - 2)).toString();
}

async function readArrayReply(reader: BufReader): Promise<any[]> {
    const line = await readLine(reader);
    const argCount = parseInt(line.substr(1, line.length - 3));
    const result = [];
    for (let i = 0; i < argCount; i++) {
        const [res] = await reader.peek(1);
        switch (res[0]) {
            case SimpleStringCode:
                result.push(await readStatusReply(reader));
                break;
            case BulkReplyCode:
                result.push(await readBulkReply(reader));
                break;
            case IntegerReplyCode:
                result.push(await readIntegerReply(reader));
                break;
            case ArrayReplyCode:
                result.push(await readArrayReply(reader));
                break;
        }
    }
    return result;
}

export function tryParseErrorReply(line: string) {
    const code = line[0];
    if (code === "-") {
        throw new ErrorReplyError(line)
    }
    throw new Error(`invalid line: ${line}`);
}

export async function connect(addr: string): Promise<Redis> {
    const conn = await dial("tcp", addr);
    return new RedisImpl(conn);
}
