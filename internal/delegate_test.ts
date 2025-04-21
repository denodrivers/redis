import { delegate } from "./delegate.ts";
import {
  assert,
  assertExists,
  assertFalse,
  assertNotStrictEquals,
} from "../deps/std/assert.ts";
import type { Has, IsExact, NotHas } from "../deps/std/testing.ts";
import { assertType } from "../deps/std/testing.ts";

Deno.test("delegate", () => {
  class Connection {
    #isConnected = false;
    connect(): void {
      this.#isConnected = true;
    }
    close(): void {
      this.#isConnected = false;
    }
    isConnected(): boolean {
      return this.#isConnected;
    }
    isClosed(): boolean {
      return !this.#isConnected;
    }
  }
  const base = new Connection();
  const proxy = delegate(base, ["connect", "isConnected"]);
  assertNotStrictEquals(proxy.connect, base.connect);
  assertNotStrictEquals(proxy.isConnected, base.isConnected);

  const kClose = "close";
  assert(
    // @ts-expect-error - `close()` should not be defined.
    proxy[kClose] === undefined,
  );
  assertExists(base[kClose]);

  assertType<Has<Connection, typeof proxy>>(true);
  assertType<NotHas<typeof proxy, Connection>>(true);
  assertType<IsExact<Connection["connect"], typeof proxy["connect"]>>(true);
  assertType<IsExact<Connection["isConnected"], typeof proxy["isConnected"]>>(
    true,
  );

  assertFalse(base.isConnected());
  assertFalse(proxy.isConnected());
  proxy.connect();
  assert(base.isConnected());
  assert(proxy.isConnected());
});
