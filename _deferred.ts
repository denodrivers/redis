export interface Deferred<T> extends Promise<T> {
  resolve(value: T): void;
  reject(error: Error): void;
}

export function deferred<T>(): Deferred<T> {
  let _resolve!: (value: T) => void;
  let _reject!: (error: Error) => void;
  const promise = new Promise<T>((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  }) as Deferred<T>;
  promise.resolve = _resolve;
  promise.reject = _reject;
  return promise;
}
