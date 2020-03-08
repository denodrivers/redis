import { Redis, connect } from "../redis.ts";
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
  prefix: string
): Promise<{
  client: Redis;
  test: (desc: string, func: Deno.TestFunction) => void | Promise<void>;
}> {
  const client = await connect(
    { hostname: "127.0.0.1", port: 6379, db: db() }
  );
  async function beforeEach() {
    await client.flushdb(false);
  }
  const test = (desc: string, func: () => void | Promise<void>) => {
    Deno.test(`[${prefix}] ${desc}`, async () => {
      await beforeEach();
      await func();
    });
  };
  return { test, client };
}
