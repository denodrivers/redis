export type XReadReply = XReadKeyData[];
export type XReadKeyData = [string, XReadIdData[]];

type XReadIdData = [string, string[]];
