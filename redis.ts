import {Buffer, Conn, dial} from "deno"
import {BufReader, BufWriter} from "http://deno.land/x/net/bufio.ts";

export type Redis = {
    get(key: string): Promise<string>
    set(key: string, value: string): Promise<string>
    del(...keys: string[]): Promise<number>
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

    async get(key: string) {
        let msg = "";
        msg += "*2\r\n";
        msg += "$3\r\n";
        msg += "GET\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        console.log(msg);
        const o = await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        console.log(msg.length, o);
        const line = await readLine(this.reader);
        console.log(line);
        const sizeStr = line.substr(1, line.length - 3);
        console.log(sizeStr);
        const size = parseInt(sizeStr);
        console.log(size);
        if (size < 0) {
            return;
        }
        const dest = new Uint8Array(size + 2);
        await this.reader.readFull(dest);
        console.log(dest);
        return new Buffer(dest.subarray(0, dest.length-2)).toString();
    };

    async set(key: string, value: string) {
        let msg = "";
        msg += "*3\r\n";
        msg += "$3\r\n";
        msg += "SET\r\n";
        msg += `$${key.length}\r\n`;
        msg += `${key}\r\n`;
        msg += `$${value.length}\r\n`;
        msg += `${value}\r\n`;
        console.log(msg);
        const n = await this.writer.write(this.encoder.encode(msg));
        await this.writer.flush();
        console.log(msg.length, n);
        const statusStr = await readLine(this.reader);
        console.log(statusStr);
        if (statusStr[0] === "+") {
            return statusStr.substr(1, statusStr.length-3)
        }
        throw new Error(`error: ${statusStr}`);
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
        const line = await readLine(this.reader);
        if (line[0] === ":") {
            const numDel = line.substr(1,line.length-3);
            return parseInt(numDel)
        }
        throw new Error(`error: ${line}`);
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

export async function connect(addr: string): Promise<Redis> {
    const conn = await dial("tcp", addr);
    return new RedisImpl(conn);
}
