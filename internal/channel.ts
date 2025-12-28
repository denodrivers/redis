export interface Channel<T> {
  send(message: T): Promise<void>;
  receive(): Promise<T>;
  close(): Promise<void>;
}

export function createChannel<T>(): Channel<T> {
  const stream = new TransformStream(
    undefined,
    { highWaterMark: Infinity },
    { highWaterMark: Infinity },
  );
  async function send(message: T): Promise<void> {
    const writer = stream.writable.getWriter();
    try {
      await writer.write(message);
    } finally {
      writer.releaseLock();
    }
  }
  async function receive(): Promise<T> {
    const reader = stream.readable.getReader();
    try {
      const result = await reader.read();
      return result?.value;
    } finally {
      reader.releaseLock();
    }
  }
  function close(): Promise<void> {
    return stream.writable.close();
  }

  return { send, receive, close };
}
