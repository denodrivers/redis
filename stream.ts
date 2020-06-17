export const MAX_SEQ_NO = "18446744073709551615";

export interface XAddMaxlen {
  exact?: boolean;
  elements: number;
}

export type XReadReply = XReadKeyData[];
export type XReadKeyData = [string, XReadIdData[]];

type XReadIdData = [string, string[]];
