export class EOFError extends Error {}

export class ConnectionClosedError extends Error {}

export class SubscriptionClosedError extends Error {}

export class ErrorReplyError extends Error {}

export class InvalidStateError extends Error {
  constructor() {
    super("Invalid state");
  }
}

export function isAlreadyClosed(error: unknown): boolean {
  return error instanceof Deno.errors.BadResource || // `BadResource` is thrown when an attempt is made to write to a closed connection,
    error instanceof Deno.errors.Interrupted;
}
