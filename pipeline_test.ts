import {test} from "https://deno.land/x/testing/mod.ts";
import {assertEqual} from "https://deno.land/x/pretty_assert/mod.ts";
import {connect} from "./redis.ts";

test(async function testPipeline() {
    const redis = await connect("127.0.0.1:6379");
    const pl = redis.pipeline();
    await Promise.all([
        pl.ping(),
        pl.ping(),
        pl.set("set1", "value1"),
        pl.set("set2", "value2"),
        pl.mget("set1", "set2"),
        pl.del("set1"),
        pl.del("set2")
    ]);
    const ret = await pl.flush();
    assertEqual(ret, [
        ["status", "PONG"],
        ["status", "PONG"],
        ["status", "OK"],
        ["status", "OK"],
        ["array", ["value1", "value2"]],
        ["integer", 1],
        ["integer", 1],
    ])
});