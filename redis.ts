import {Buffer, Conn, dial} from "deno"
import {BufReader, BufWriter} from "http://deno.land/x/net/bufio.ts";
import {ConnectionClosedError} from "./errors.ts";

export type Redis = {
    // connection
    quit(): Promise<void>
    auth(password: string): Promise<string>
    // key
    exists(key: string): Promise<boolean>
    del(...keys: string[]): Promise<number>
    keys(pattern: string): Promise<string[]>
    type(key: string): Promise<string>
    randomkey(): Promise<string>
    // string
    get(key: string): Promise<string>
    getset(key: string, value: string): Promise<string>
    mget(...keys: string[]): Promise<string[]>
    set(key: string, value: string): Promise<string>
    setnx(key: string, value: string): Promise<number>
    setex(key: string, time: number, value: string): Promise<string>;
    mset(...keyValues: string[]): Promise<string>
    msetnx(...keyValues: string[]): Promise<number>
    append(key: string, value: string): Promise<number>
    substr(key: string, start: number, end: number): Promise<string>
    getrange(key: string, start: number, end: number): Promise<string>
    incr(key: string): Promise<number>
    incrby(key: string, value: number): Promise<number>
    decr(key: string): Promise<number>
    decrby(key: string, value: number): Promise<number>
    // List
    rpush(key: string, value: string): Promise<number>
    lpush(key: string, value: string): Promise<number>
    llen(key: string): Promise<number>
    lrange(key: string, start: number, end: number): Promise<string[]>
    ltrim(key: string, start: number, end: number): Promise<string>
    lindex(key: string, index: number): Promise<string>;
    lset(key: string, index: number, value: string): Promise<string>;
    lrem(key: string, count: number, value: string): Promise<number>;
    lpop(key: string): Promise<string>;
    rpop(key: string): Promise<string>;
    // Set
    sadd(key: string, member: string): Promise<number>
    srem(key: string, member: string): Promise<number>
    spop(key: string): Promise<string>
    smove(srcKey: string, dstKey: string, member: string): Promise<number>
    scard(key: string): Promise<number>
    sismember(key: string): Promise<boolean>
    // SortedSet
    zadd(key: string, score: number, member: string): Promise<number>
    zrem(key: string, member: string): Promise<number>
    zincrby(key: string, incr: number, member: string): Promise<string>
    zrank(key: string, member: string): Promise<number|string>
    zrevrank(key, member): Promise<number|string>
    // zrange(key, start, end, scores)
    // zrevrange(key, start, end, scores)
    zrangebyscore(key: string, mim: number, max: number): Promise<string[]>
    zcount(key: string, min: number, max: number): Promise<number>
    zremrangebyrank(key: string, start: number, end: number): Promise<number>
    zremrangebyscore(key: string, min: number, max: number): Promise<number>
    zcard(key: string): Promise<number>
    zscore(key: string, element: string): Promise<string>
    // zunionstore(dstkey, N, k1, ..., kN, [WEIGHTS, w1, ..., wN], [AGGREGATE, SUM|MIN|MAX])
    // zinterstore(dstkey, N, k1, ..., kN, [WEIGHTS, w1, ..., wN], [AGGREGATE, SUM|MIN|MAX])

    //
    readonly isClosed: boolean;
    close()
}

const IntegerReplyCode = ":".charCodeAt(0);
const BulkReplyCode = "$".charCodeAt(0);

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

    private async execStatusReply(command: string, ...args: string[]): Promise<"OK"> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        return readStatusReply(this.reader);
    }

    private async execIntegerReply(command: string, ...args: string[]): Promise<number> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        return readIntegerReply(this.reader);
    }

    private async execBulkReply(command: string, ...args: string[]): Promise<string> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        return readBulkReply(this.reader);
    }

    private async execMultiBulkReply(command: string, ...args: string[]): Promise<string[]> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        return readMultiBulkReply(this.reader);
    }

    private async execIntegerOrNilReply(command: string, ...args: string[]): Promise<number|string> {
        if (this.isClosed) throw new ConnectionClosedError();
        const msg = createRequest(command, ...args);
        await writeRequest(this.writer, msg);
        const code = await this.reader.peek(1)[0];
        if (code === IntegerReplyCode) {
            return readIntegerReply(this.reader);
        } else {
            return readBulkReply(this.reader);
        }
    }

    auth(password: string) {
        return this.execStatusReply("AUTH", password)
    }

    async quit() {
        try {
            const msg = createRequest("QUIT");
            await writeRequest(this.writer, msg);
        } finally {
            this._isClosed = true;
        }
    }

    async exists(key: string) {
        return await this.execIntegerReply("EXISTS", key) === 1;
    }

    keys(pattern: string) {
        return this.execMultiBulkReply("KEYS", pattern);
    }

    type(key: string) {
        return this.execStatusReply("TYPE", key);
    }

    randomkey () {
        return this.execBulkReply("RANDOMKEY");
    }

    get(key: string) {
        return this.execBulkReply("GET", key);
    }

    getset(key: string, value: string) {
        return this.execBulkReply("GETSET", key, value);
    }

    mget(...keys: string[]) {
        return this.execMultiBulkReply("MGET", ...keys);
    }

    set(key: string, value: string) {
        return this.execStatusReply("SET", key, value);
    };

    mset(...keyValues: string[]) {
        return this.execStatusReply("MSET", ...keyValues);
    }

    msetnx(...keyValues: string[]) {
        return this.execIntegerReply("MSETNX", ...keyValues);
    }

    setex(key: string, time: number, value: string) {
        return this.execStatusReply("SETEX", key, `${time}`, value);
    }

    setnx(key: string, value: string) {
        return this.execIntegerReply("SETNX", key, value);
    }

    append(key: string, value: string) {
        return this.execIntegerReply("APPEND", key, value);
    }

    // available >= 2.4.0, alias of substr
    getrange(key: string, start: number, end: number) {
        return this.execBulkReply("GETRANGE", key, `${start}`, `${end}`);
    }

    substr(key: string, start: number, end: number) {
        return this.execBulkReply("SUBSTR", key, `${start}`, `${end}`)
    }

    del(...keys: string[]) {
        return this.execIntegerReply("DEL", ...keys);
    }

    incr(key: string) {
        return this.execIntegerReply("INCR", key);
    }

    incrby(key: string, value: number) {
        return this.execIntegerReply("INCRBY", key, `${value}`);
    }

    decr(key: string) {
        return this.execIntegerReply("DECR", key);
    }

    decrby(key: string, value: number) {
        return this.execIntegerReply("DECRBY", key, `${value}`);
    }

    rpush(key: string, value: string) {
        return this.execIntegerReply("RPUSH", key, value);
    }

    lpush(key: string, value: string) {
        return this.execIntegerReply("LPUSH", key, value);
    }

    llen(key: string) {
        return this.execIntegerReply("LLEN", key);
    }

    lrange(key: string, start: number, end: number) {
        return this.execMultiBulkReply("LRANGE", `${start}`, `${end}`);
    }

    lindex(key: string, index: number) {
        return this.execBulkReply("LINDEX", key, `${index}`);
    }

    lpop(key: string) {
        return this.execBulkReply("LPOP", key);
    }

    lrem(key: string, count: number, value: string) {
        return this.execIntegerReply("LREM", key, `${count}`, value);
    }

    lset(key: string, index: number, value: string) {
        return this.execStatusReply("LSET", key, `${index}`, value);
    }

    ltrim(key: string, start: number, end: number) {
        return this.execStatusReply("LTRIM", key, `${start}`, `${end}`)
    }

    rpop(key: string) {
        return this.execBulkReply("RPOP", key);
    }

    // set
    sadd(key: string, member: string) {
        return this.execIntegerReply("SADD", key, member);
    }

    scard(key: string) {
        return this.execIntegerReply("SCARD", key);
    }

    smove(srcKey: string, dstKey: string, member: string) {
        return this.execIntegerReply("SMOVE", srcKey, dstKey, member);
    }

    spop(key: string) {
        return this.execBulkReply("SPOP", key);
    }

    srem(key: string, member: string) {
        return this.execIntegerReply("SREM", key, member);
    }

    async sismember(key: string) {
        return await this.execIntegerReply("SISMEMBER", key) === 1
    }

    // sorted set
    zadd (key: string, score: number, member: string) {
        return this.execIntegerReply("ZADD", `${score}`, member);
    }

    zcard(key) {
        return this.execIntegerReply("ZCARD")
    }

    zcount (key, min, max) {
        return this.execIntegerReply("ZCOUNT", key, `${min}`, `${max}`)
    }

    zincrby (key: string, incr: number, member: string) {
        return this.execBulkReply("ZINCRBY", key, `${incr}`, member);
    }

    zrangebyscore (key: string, min: number, max: number) {
        return this.execMultiBulkReply("ZRANGEBYSCORE", key, `${min}`, `${max}`)
    }

    zrank(key: string, member: string) {
        return this.execIntegerOrNilReply("ZRANK", key, member);
    }

    zrem(key: string, member: string) {
        return this.execIntegerReply("ZREM", key, member)
    }

    zremrangebyrank(key: string, start: number, end: number) {
        return this.execIntegerReply("ZREMRANGEBYRANK", key, `${start}`, `${end}`);
    }

    zremrangebyscore(key: string, min: number, max: number) {
        return this.execIntegerReply("ZREMRANGEBYSCORE", key, `${min}`, `${max}`)
    }

    zrevrank (key: string, member: string) {
        return this.execIntegerOrNilReply("ZREVRANK", key, member)
    }

    zscore(key: string, element: string) {
        return this.execStatusReply("ZSCORE", element)
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

export function createRequest(command: string, ...args: string[]) {
    let msg = "";
    msg += `*${1 + args.length}\r\n`;
    msg += `$${command.length}\r\n`;
    msg += `${command}\r\n`;
    for (const arg of args) {
        msg += `$${arg.length}\r\n`;
        msg += `${arg}\r\n`;
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

async function readMultiBulkReply(reader: BufReader): Promise<string[]> {
    const line = await readLine(reader);
    if (line[0] !== "*") {
        tryParseErrorReply(line);
    }
    const argCount = parseInt(line.substr(1, line.length - 3));
    const result = [];
    for (let i = 0; i < argCount; i++) {
        result.push(await readBulkReply(reader));
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
