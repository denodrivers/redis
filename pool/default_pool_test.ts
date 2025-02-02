import { assert, assertEquals, assertRejects } from "../deps/std/assert.ts";
import { createDefaultPool } from "./default_pool.ts";

class FakeConnection implements Disposable {
  #isClosed = false;
  isClosed() {
    return this.#isClosed;
  }
  [Symbol.dispose]() {
    if (this.#isClosed) {
      throw new Error("Already closed");
    }
    this.#isClosed = true;
  }
}

Deno.test({
  name: "DefaultPool",
  permissions: "none",
  fn: async () => {
    const openConnections: Array<FakeConnection> = [];
    const pool = createDefaultPool({
      acquire: () => {
        const connection = new FakeConnection();
        openConnections.push(connection);
        return Promise.resolve(connection);
      },
      maxConnections: 2,
    });
    assertEquals(openConnections, []);

    const signal = AbortSignal.timeout(200);

    const conn1 = await pool.acquire(signal);
    assertEquals(openConnections, [conn1]);
    assert(openConnections.every((x) => !x.isClosed()));
    assert(!signal.aborted);

    const conn2 = await pool.acquire(signal);
    assertEquals(openConnections, [conn1, conn2]);
    assert(!conn2.isClosed());
    assert(openConnections.every((x) => !x.isClosed()));
    assert(!signal.aborted);

    {
      // Tests timeout handling
      await assertRejects(
        () => pool.acquire(signal),
        "Intentionally aborted",
      );
      assert(signal.aborted);
      assertEquals(openConnections, [conn1, conn2]);
      assert(openConnections.every((x) => !x.isClosed()));
    }

    {
      // Tests `release()`
      pool.release(conn2);
      assertEquals(openConnections, [conn1, conn2]);

      const conn = await pool.acquire(new AbortController().signal);
      assert(conn === conn2, "A new connection should not be created");
      assertEquals(openConnections, [conn1, conn2]);
    }

    {
      // `Pool#acquire` should wait for an active connection to be released.
      const signal = AbortSignal.timeout(3_000);
      const promise = pool.acquire(signal);
      setTimeout(() => {
        pool.release(conn1);
      }, 50);
      const conn = await promise;
      assert(conn === conn1, "A new connection should not be created");
      assertEquals(openConnections, [conn1, conn2]);
      assert(!signal.aborted);
    }

    {
      // `Pool#close` closes all connections
      pool.close();
      assert(openConnections.every((x) => x.isClosed()));
    }
  },
});
