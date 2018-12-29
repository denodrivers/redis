import {test, assertEqual} from "https://deno.land/x/testing/testing.ts"
import {connect} from "./redis.ts";
test(async function testGetWhenNil() {
    const redis = await connect("127.0.0.1:6379");
    const hoge = await redis.get("none");
    assertEqual(hoge, void 0);
    redis.close();
});
test(async function testGetSet() {
    const redis = await connect("127.0.0.1:6379");
    const s = await redis.set("hoge", "fuga");
    assertEqual(s, "OK");
    const fuga = await redis.get("hoge");
    assertEqual(fuga, "fuga");
    redis.close();
});
test(async function testDel() {
    const redis = await connect("127.0.0.1:6379");
    let s = await redis.set("del1", "fuga");
    assertEqual(s, "OK");
    s = await redis.set("del2", "fugaaa");
    assertEqual(s, "OK");
    const deleted = await redis.del("del1", "del2");
    assertEqual(deleted, 2);
    redis.close();
});