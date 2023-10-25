import { concateBytes } from "./concate_bytes.ts";

const LF = "\n".charCodeAt(0);
/**
 * Wraps `ReadableStream` to provide buffering. Heavily inspired by `deno_std/io/buf_reader.ts`.
 *
 * {@link https://github.com/denoland/deno_std/blob/0.204.0/io/buf_reader.ts}
 */
export class BufferedReadableStream {
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #buffer: Uint8Array;
  constructor(readable: ReadableStream<Uint8Array>) {
    // TODO: This class could probably be optimized with a BYOB reader.
    this.#reader = readable.getReader();
    this.#buffer = new Uint8Array(0);
  }

  async readLine(): Promise<Uint8Array> {
    const i = this.#buffer.indexOf(LF);
    if (i > -1) {
      return this.#consume(i + 1);
    }
    for (;;) {
      await this.#fill();
      const i = this.#buffer.indexOf(LF);
      if (i > -1) return this.#consume(i + 1);
    }
  }

  async readFull(buffer: Uint8Array): Promise<void> {
    if (buffer.length <= this.#buffer.length) {
      buffer.set(this.#consume(buffer.length));
      return;
    }
    for (;;) {
      await this.#fill();
      if (this.#buffer.length >= buffer.length) break;
    }
    return this.readFull(buffer);
  }

  #consume(n: number): Uint8Array {
    const b = this.#buffer.subarray(0, n);
    this.#buffer = this.#buffer.subarray(n);
    return b;
  }

  async #fill() {
    const chunk = await this.#reader.read();
    if (chunk.done) {
      await this.#reader.cancel(new Deno.errors.BadResource());
      throw new Deno.errors.BadResource();
    }
    const bytes = chunk.value;
    this.#buffer = concateBytes(this.#buffer, bytes);
  }
}
