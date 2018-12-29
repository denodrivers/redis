import {Conn} from "deno"
import {serve} from "https://deno.land/x/net/http.ts"
import {acceptWebSocket} from "https://denopkg.com/keroxp/deno-ws/ws.ts"
async function main() {
    for await (const req of serve("0.0.0.0:8080")) {
        if (req.url === "/ws") {
            const [err, sock] = await acceptWebSocket(req);
            sock.send("hello!")
        }
    }
}
