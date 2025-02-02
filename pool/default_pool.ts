import type { Pool } from "./pool.ts";

class AlreadyRemovedFromPoolError extends Error {
  constructor() {
    super("This connection has already been removed from the pool.");
  }
}

const kDefaultTimeout = 5_000;
class DefaultPool<T extends Disposable> implements Pool<T> {
  readonly #idle: Array<T> = [];
  readonly #connections: Array<T> = [];
  #connectionCount: number = 0;
  readonly #deferredQueue: Array<PromiseWithResolvers<T>> = [];
  readonly #options: Required<PoolOptions<T>>;

  constructor(
    {
      maxConnections = 8,
      acquire,
    }: PoolOptions<T>,
  ) {
    this.#options = {
      acquire,
      maxConnections,
    };
  }

  async acquire(signal?: AbortSignal): Promise<T> {
    signal ||= AbortSignal.timeout(kDefaultTimeout);
    signal.throwIfAborted();
    if (this.#idle.length > 0) {
      const conn = this.#idle.shift()!;
      return Promise.resolve(conn);
    }

    if (this.#connectionCount < this.#options.maxConnections) {
      this.#connectionCount++;
      try {
        const connection = await this.#options.acquire();
        this.#connections.push(connection);
        return connection;
      } catch (error) {
        this.#connectionCount--;
        throw error;
      }
    }

    const deferred = Promise.withResolvers<T>();
    this.#deferredQueue.push(deferred);
    const { promise, reject } = deferred;
    const onAbort = () => {
      const i = this.#deferredQueue.indexOf(deferred);
      if (i === -1) return;
      this.#deferredQueue.splice(i, 1);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    return promise;
  }

  #has(conn: T): boolean {
    return this.#connections.includes(conn);
  }

  release(conn: T): void {
    if (!this.#has(conn)) {
      throw new AlreadyRemovedFromPoolError();
    } else if (this.#deferredQueue.length > 0) {
      const i = this.#deferredQueue.shift()!;
      i.resolve(conn);
    } else {
      this.#idle.push(conn);
    }
  }

  close() {
    const errors: Array<unknown> = [];
    for (const x of [...this.#connections]) {
      try {
        x[Symbol.dispose]();
      } catch (error) {
        errors.push(error);
      }
    }
    this.#connections.length = 0;
    this.#idle.length = 0;
    if (errors.length > 0) {
      throw new AggregateError(errors);
    }
  }
}

export interface PoolOptions<T extends Disposable> {
  maxConnections?: number;
  acquire(): Promise<T>;
}

export function createDefaultPool<T extends Disposable>(
  options: PoolOptions<T>,
): Pool<T> {
  return new DefaultPool<T>(options);
}
