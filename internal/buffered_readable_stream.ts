import { concat } from "../vendor/https/deno.land/std/bytes/concat.ts";

const LF = "\n".charCodeAt(0);
/**
 * Wraps `ReadableStream` to provide buffering.
 *
 * Heavily inspired by `deno_std/io/buf_reader.ts`.
 * {@link https://github.com/denoland/deno_std/blob/0.204.0/io/buf_reader.ts}
 */
export class BufferedReadableStream {
  #readable: ReadableStream<Uint8Array>;
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #buffer: Uint8Array;
  constructor(readable: ReadableStream<Uint8Array>) {
    this.#readable = readable;
    this.#reader = readable.getReader();
    this.#buffer = new Uint8Array(0);
  }

  async readLine(): Promise<Uint8Array> {
    const i = this.#buffer.indexOf(LF);
    if (i > -1) {
      const line = this.#buffer.slice(0, i + 1);
      this.#buffer = this.#buffer.subarray(i + 1);
      return line;
    }
    for (;;) {
      await this.#fill();
      if (this.#buffer.lastIndexOf(LF) > -1) break;
    }
    return this.readLine();
  }

  async readFull(buffer: Uint8Array): Promise<void> {
    if (buffer.length <= this.#buffer.length) {
      buffer.set(this.#buffer.subarray(0, buffer.length));
      this.#buffer = this.#buffer.subarray(buffer.length);
      return;
    }
    for (;;) {
      await this.#fill();
      if (this.#buffer.length >= buffer.length) break;
    }
    return this.readFull(buffer);
  }

  async #fill() {
    const chunk = await this.#reader.read();
    if (chunk.done) {
      throw new Deno.errors.UnexpectedEof();
    }
    const bytes = chunk.value;
    this.#buffer = concat(this.#buffer, bytes);
  }
}
