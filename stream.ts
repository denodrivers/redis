export const MAX_SEQ_NO = "18446744073709551615";

export interface XMaxlen {
  approx?: boolean;
  elements: number;
}

export type XReadReply = XReadKeyData[];
export type XReadKeyData = [string, XReadIdData[]];

export interface XClaimOpts {
  group: string;
  consumer: string;
  minIdleTime: number;
  idle?: number;
  time?: number;
  retryCount?: number;
  force?: boolean;
  justIds?: boolean;
}

type XReadIdData = [string, string[]];
