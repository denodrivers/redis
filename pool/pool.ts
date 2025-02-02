export interface Pool<T extends Disposable> {
  acquire(signal?: AbortSignal): Promise<T>;
  release(item: T): void;
  close(): void;
}
