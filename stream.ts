export const MAX_SEQ_NO = "18446744073709551615";

export interface XId {
  epochMillis: bigint | number;
  seqNo: bigint | number;
}

export interface XMessage {
  id: XId;
  field_values: Map<string, string>;
}

export interface XKeyId {
  key: string;
  id: string;
}

export type XReadStream = { key: string; messages: XMessage[] };
export type XReadReply = XReadStream[];

// basic data returned by redis
export type XReadIdData = [string, string[]];
export type XReadStreamRaw = [string, XReadIdData[]];
export type XReadReplyRaw = XReadStreamRaw[];

export type XIdAdd = XId | "*" | [bigint | number, bigint | number] | 0;
export type XIdGroupRead = XId | ">";

export interface XMaxlen {
  approx?: boolean;
  elements: number;
}

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
  consumers: XInfoConsumer[];
}
export interface XPendingCount {
  kind: "count";
  ids: XPendingId[];
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

export interface XInfoStream {
  length: number;
  radixTreeKeys: number;
  radixTreeNodes: number;
  groups: number;
  lastGeneratedId: XId;
  firstEntry: XMessage;
  lastEntry: XMessage;
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

export interface XReadOpts {
  count?: number;
  block?: number;
}

export interface XReadGroupOpts {
  group: string;
  consumer: string;
  count?: number;
  block?: number;
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

export function parseXMessage(
  raw: XReadIdData,
): XMessage {
  let m = 0;
  let field_values: Map<string, string> = new Map();
  let f: string | undefined = undefined;
  for (const data of raw[1]) {
    if (m % 2 === 0) {
      f = data;
    } else if (f) {
      field_values.set(f, data);
    }
    m++;
  }
  return { id: parseXId(raw[0]), field_values: field_values };
}

export function parseXReadReply(
  raw: XReadReplyRaw,
): XReadReply {
  const out: XReadStream[] = [];
  for (const [key, idData] of raw) {
    const messages = [];
    for (const rawMsg of idData) {
      messages.push(parseXMessage(rawMsg));
    }
    out.push({ key, messages });
  }

  return out;
}

export function parseXId(raw: string) {
  const [ms, sn] = raw.split("-");
  return { epochMillis: BigInt(ms), seqNo: BigInt(sn) };
}

export function xidString(xid: XIdAdd) {
  if (xid === 0) return "0-0";
  if (xid === "*") return "*";
  if (xid instanceof Array && xid.length > 1) return `${xid[0]}-${xid[1]}`;
  if (isXId(xid)) return `${xid.epochMillis}-${xid.seqNo}`;
  throw "fail";
}

function isXId(id: XIdAdd): id is XId {
  return (id as XId).epochMillis !== undefined;
}
