interface Options {
  signal?: AbortSignal;
}
/**
 * Converts {@linkcode EventTarget} to {@linkcode AsyncIterableIterator}, similar to `on()` in `node:events`.
 */
export function on(
  eventTarget: EventTarget,
  event: string,
  options: Options = {},
): AsyncIterableIterator<Event> {
  // TODO: Optimize the implementation.
  const abortController = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, abortController.signal])
    : abortController.signal;
  const readerQueue: Array<PromiseWithResolvers<Event>> = [];
  const bufferedEventQueue: Array<Event> = [];
  if (!signal.aborted) {
    eventTarget.addEventListener(
      event,
      (event) => {
        if (readerQueue.length) {
          const { resolve } = readerQueue.shift()!;
          resolve(event);
        } else {
          bufferedEventQueue.push(event);
        }
      },
      { signal },
    );
  }
  function cleanup(): void {
    for (const d of readerQueue) {
      d.reject(signal.reason);
    }
    readerQueue.length = 0;
  }
  const iter: AsyncIterableIterator<Event> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (signal.aborted) {
        return { done: true, value: undefined };
      } else if (bufferedEventQueue.length) {
        const event = bufferedEventQueue.shift()!;
        return { done: false, value: event };
      } else {
        const deferred = Promise.withResolvers<Event>();
        readerQueue.push(deferred);
        const value = await deferred.promise;
        return { done: false, value };
      }
    },
    return() {
      abortController.abort();
      cleanup();
      return Promise.resolve({ done: true, value: undefined });
    },
  };
  return iter;
}
