export const MAX_SEQ_NO = "18446744073709551615";

export interface XMaxlen {
  approx?: boolean;
  elements: number;
}

export type XReadReply = XReadKeyData[];
export type XReadKeyData = [string, XReadIdData[]];
type XReadIdData = [string, string[]];

export type XPendingReply = XPendingEmpty | XPendingData | XPendingCount;
export interface XPendingEmpty {
  kind: "empty";
}
/**
 * @param count Limit on the number of messages to return per call.
 * @param startId ID for the first pending record.
 * @param endId  ID for the final pending record.
 * @param consumers  Every consumer in the consumer group
 * with at least one pending message, and the number of
 * pending messages it has.
 */
export interface XPendingData {
  kind: "data";
  count: number;
  startId: string;
  endId: string;
  consumers: [XInfoConsumer];
}
export interface XPendingCount {
  kind: "count";
  ids: [XPendingId];
}

/**
 * Represents a pending message parsed from xpending.
 * 
 * @param id The ID of the message
 * @param consumer The name of the consumer that fetched the message
 *  and has still to acknowledge it. We call it the
 *  current owner of the message.
 * @param lastDeliveredMs The number of milliseconds that elapsed since the 
 *  last time this message was delivered to this consumer.
 * @param timesDelivered The number of times this message was delivered.
 */
export interface XPendingId {
  id: string;
  consumer: string;
  lastDeliveredMs: number;
  timesDelivered: number;
}
/** Used in the XPENDING command, all three of these
 * args must be specified if _any_ are specified.
 */
export interface StartEndCount {
  start: number;
  end: number;
  count: number;
}

// TODO check command name against deno-redis API
/**
 * A consumer parsed from xinfo command.
 * 
 * @param name Name of the consumer group.
 * @param pending Number of pending messages for this specific consumer.
 * @param idle This consumer's idle time in milliseconds.
 */
export interface XInfoConsumer {
  name: string;
  pending: number;
  idle: number;
}

export interface XClaimOpts {
  group: string;
  consumer: string;
  minIdleTime: number;
  idle?: number;
  time?: number;
  retryCount?: number;
  force?: boolean;
  justId?: boolean;
}
