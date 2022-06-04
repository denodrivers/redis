export interface Backoff {
  /**
   * Returns the next backoff interval in milliseconds
   */
  (attempts: number): number;
}

export interface ExponentialBackoffOptions {
  /**
   * @default 2
   */
  multiplier: number;
  /**
   * The maximum backoff interval in milliseconds
   * @default 5000
   */
  maxInterval: number;
  /**
   * The minimum backoff interval in milliseconds
   * @default 500
   */
  minInterval: number;
}

export function exponentialBackoff({
  multiplier = 2,
  maxInterval = 5000,
  minInterval = 500,
}: Partial<ExponentialBackoffOptions> = {}): Backoff {
  return (attempts) =>
    Math.min(maxInterval, minInterval * (multiplier ** (attempts - 1)));
}
