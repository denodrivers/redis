import {Buffer, Conn, dial} from "deno"
import {BufReader, BufWriter} from "http://deno.land/x/net/bufio.ts";

export type Redis = {
    exists(key: string): Promise<boolean>
    get(key: string): Promise<string>
    getset(key: string, value: string): Promise<string>
    set(key: string, value: string): Promise<string>
    del(...keys: string[]): Promise<number>
    incr(key: string): Promise<number>
    incrby(key: string, value: number): Promise<number>
    decr(key: string): Promise<number>
    decrby(key: string, value: number): Promise<number>
    close()
}

class RedisImpl implements Redis {
    writer: BufWriter;
    reader: BufReader;
    encoder = new TextEncoder();

    constructor(private readonly conn: Conn) {
        this.writer = new BufWriter(conn);
        this.reader = new BufReader(conn);
    }

    async exists(key: string) {
        let msg = "";
        msg += "*2\r\n";
        msg += "$6\r\n";
        msg += "EXISTS\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply) === 1;
    }

    async get(key: string) {
        let msg = "";
        msg += "*2\r\n";
        msg += "$3\r\n";
        msg += "GET\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        return readBulkReply(this.reader);
    }

    async getset(key: string, value: string) {
        let msg = "";
        msg += "*3\r\n";
        msg += "$6\r\n";
        msg += "GETSET\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        msg += `$${value.length}\r\n`;
        msg += `${value}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        return readBulkReply(this.reader);
    }

    async set(key: string, value: string) {
        let msg = "";
        msg += "*3\r\n";
        msg += "$3\r\n";
        msg += "SET\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        msg += `$${value.length}\r\n`;
        msg += `${value}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseStatusReply(reply);
    };

    async del(...keys: string[]) {
        let msg = "";
        msg += `*${1+keys.length}\r\n`;
        msg += "$3\r\n";
        msg += "DEL\r\n";
        for (const key of keys) {
            msg += `$${key.length}\r\n`;
            msg += `${key}\r\n`;
        }
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply);
    }

    close() {
        this.conn.close();
    }

    async incr(key: string) {
        let msg = "";
        msg += `*2\r\n`;
        msg += "$4\r\n";
        msg += "INCR\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply);
    }

    async incrby(key: string, value: number) {
        let msg = "";
        const valueStr = `${value}`;
        msg += `*3\r\n`;
        msg += "$6\r\n";
        msg += "INCRBY\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        msg += `$${valueStr.length}\r\n`;
        msg += `${valueStr}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply);
    }

    async decr(key: string) {
        let msg = "";
        msg += `*2\r\n`;
        msg += "$4\r\n";
        msg += "DECR\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply);
    }

    async decrby(key: string, value: number) {
        let msg = "";
        const valueStr = `${value}`;
        msg += `*3\r\n`;
        msg += "$6\r\n";
        msg += "DECRBY\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        msg += `$${valueStr.length}\r\n`;
        msg += `${valueStr}\r\n`;
        await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        const reply = await readLine(this.reader);
        return parseIntegerReply(reply);
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

export function parseStatusReply(line: string): string {
    if (line[0] === "+") {
        return line.substr(1, line.length-3)
    }
    tryParseErrorReply(line);
}

export function parseIntegerReply(line: string): number {
    const code = line[0];
    if (code === ":") {
        const str = line.substr(1, line.length-3);
        return parseInt(str);
    }
    tryParseErrorReply(line);
}

export async function readBulkReply(reader: BufReader): Promise<string> {
    const line = await readLine(reader);
    if (line[0] === "$") {
        const sizeStr = line.substr(1, line.length - 3);
        const size = parseInt(sizeStr);
        if (size < 0) {
            return;
        }
        const dest = new Uint8Array(size + 2);
        await reader.readFull(dest);
        return new Buffer(dest.subarray(0, dest.length - 2)).toString();
    }
    tryParseErrorReply(line);
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
