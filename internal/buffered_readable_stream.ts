import { concateBytes } from "./concate_bytes.ts";

const LF = "\n".charCodeAt(0);
/**
 * Wraps `ReadableStream` to provide buffering. Heavily inspired by `deno_std/io/buf_reader.ts`.
 *
 * {@link https://github.com/denoland/deno_std/blob/0.204.0/io/buf_reader.ts}
 */
export class BufferedReadableStream {
  #reader: ReadableStreamBYOBReader;
  #buffer: Uint8Array;
  constructor(readable: ReadableStream<Uint8Array>) {
    this.#reader = readable.getReader({ mode: "byob" });
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

  async readN(n: number): Promise<Uint8Array> {
    if (n <= this.#buffer.length) {
      return this.#consume(n);
    }

    if (n === 0) {
      return new Uint8Array(0);
    }

    if (this.#buffer.length === 0) {
      const buffer = new Uint8Array(n);
      const { done, value } = await this.#reader.read(buffer, {
        min: buffer.length,
      });
      if (done) {
        throw new Deno.errors.BadResource();
      }
      return value;
    } else {
      const remaining = n - this.#buffer.length;
      const buffer = new Uint8Array(remaining);
      const { value, done } = await this.#reader.read(buffer, {
        min: remaining,
      });
      if (done) {
        throw new Deno.errors.BadResource();
      }

      const result = concateBytes(this.#buffer, value);
      this.#buffer = new Uint8Array();
      return result;
    }
  }

  #consume(n: number): Uint8Array {
    const b = this.#buffer.subarray(0, n);
    this.#buffer = this.#buffer.subarray(n);
    return b;
  }

  async #fill() {
    const chunk = await this.#reader.read(new Uint8Array(1024));
    if (chunk.done) {
      throw new Deno.errors.BadResource();
    }
    const bytes = chunk.value;
    this.#buffer = concateBytes(this.#buffer, bytes);
  }
}
