import { Redis, connect, RedisConnectOptions } from "../redis.ts";
import { assert } from "../vendor/https/deno.land/std/testing/asserts.ts";

function* dbIndex() {
  let i = 0;
  while (true) {
    yield i;
    i++;
    if (i > 15) i = 0;
  }
}
const it = dbIndex();
function db(): number {
  const { value } = it.next();
  assert(value != undefined);
  return value;
}

export async function makeTest(
  prefix: string,
): Promise<{
  client: Redis;
  opts: RedisConnectOptions;
  test: (name: string, func: () => void | Promise<void>) => void;
}> {
  const opts = { hostname: "127.0.0.1", port: 6379, db: db() };
  const client = await connect(opts);
  async function beforeEach() {
    await client.flushdb(false);
  }
  const test = (desc: string, func: () => void | Promise<void>) => {
    Deno.test(`[${prefix}] ${desc}`, async () => {
      await beforeEach();
      await func();
    });
  };
  return { test, client, opts };
}
