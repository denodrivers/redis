import { ErrorReplyError } from "../io.ts";
import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "../vendor/https/deno.land/std/testing/asserts.ts";
import { newClient, startRedis, stopRedis, TestSuite } from "./test_util.ts";

const suite = new TestSuite("general");
const server = await startRedis({ port: 7004 });
const opts = { hostname: "127.0.0.1", port: 7004 };
const client = await newClient(opts);

suite.afterAll(() => {
  stopRedis(server);
  client.close();
});

suite.test("conccurent", async () => {
  let promises: Promise<string | undefined>[] = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(client.set(key, key));
  }
  await Promise.all(promises);
  promises = [];
  for (const key of ["a", "b", "c"]) {
    promises.push(client.get(key));
  }
  const [a, b, c] = await Promise.all(promises);
  assertEquals(a, "a");
  assertEquals(b, "b");
  assertEquals(c, "c");
});

suite.test("db0", async () => {
  const key = "exists";
  const client1 = await newClient({ ...opts, db: 0 });
  await client1.set(key, "aaa");
  const exists1 = await client1.exists(key);
  assertEquals(exists1, 1);
  const client2 = await newClient({ ...opts, db: 0 });
  const exists2 = await client2.exists(key);
  assertEquals(exists2, 1);
  client1.close();
  client2.close();
});

suite.test("connect with wrong password", async () => {
  await assertThrowsAsync(async () => {
    await newClient({
      hostname: "127.0.0.1",
      port: 7004,
      password: "wrong_password",
    });
  }, ErrorReplyError);
});

suite.test("connect with empty password", async () => {
  // In Redis, authentication with an empty password will always fail.
  await assertThrowsAsync(async () => {
    await newClient({
      hostname: "127.0.0.1",
      port: 7004,
      password: "",
    });
  }, ErrorReplyError);
});

suite.test("exists", async () => {
  const key = "exists";
  const client1 = await newClient({ ...opts, db: 0 });
  await client1.set(key, "aaa");
  const exists1 = await client1.exists(key);
  assertEquals(exists1, 1);
  const client2 = await newClient({ ...opts, db: 1 });
  const exists2 = await client2.exists(key);
  assertEquals(exists2, 0);
  client1.close();
  client2.close();
});

[Infinity, NaN, "", "port"].forEach((v) => {
  suite.test(`invalid port: ${v}`, async () => {
    await assertThrowsAsync(
      async () => {
        await newClient({ hostname: "127.0.0.1", port: v });
      },
      Error,
      "invalid",
    );
  });
});

suite.test("execRawReply", async () => {
  assertEquals(await client.executor.exec("SET", "key", "a"), ["status", "OK"]);
  assertEquals(await client.executor.exec("GET", "key"), ["bulk", "a"]);
});

suite.test("eval", async () => {
  const raw = await client.eval(
    "return {KEYS[1],KEYS[2],ARGV[1],ARGV[2]}",
    2,
    ["1", "2"],
    ["3", "4"],
  );
  assert(Array.isArray(raw));
  assertEquals(raw, ["1", "2", "3", "4"]);
});

suite.runTests();
