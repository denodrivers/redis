/**
 * Represents a number in RESP2/RESP3.
 */
export const IntegerReplyCode = ":".charCodeAt(0);
/**
 * Represents a blob string in RESP2/RESP3.
 */
export const BulkReplyCode = "$".charCodeAt(0);
export const SimpleStringCode = "+".charCodeAt(0);
export const ArrayReplyCode = "*".charCodeAt(0);
/**
 * Represents a simple error in RESP2/RESP3.
 */
export const ErrorReplyCode = "-".charCodeAt(0);
/** Represents a map which is introduced in RESP3. */
export const MapReplyCode = "%".charCodeAt(0);
/** Represents the null type which is introduced in RESP3. */
export const NullReplyCode = "_".charCodeAt(0);
