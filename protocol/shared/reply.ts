/**
 * Represents a number in RESP2/RESP3.
 */
export const IntegerReplyCode = ":".charCodeAt(0);
/**
 * Represents a double which is introduced in RESP3.
 */
export const DoubleReplyCode = ",".charCodeAt(0);
/**
 * Represents a blob string in RESP2/RESP3.
 */
export const BulkReplyCode = "$".charCodeAt(0);
export const SimpleStringCode = "+".charCodeAt(0);
/** Represents a verbatim string in RESP3. */
export const VerbatimStringCode = "=".charCodeAt(0);
export const ArrayReplyCode = "*".charCodeAt(0);
/**
 * Represents a simple error in RESP2/RESP3.
 */
export const ErrorReplyCode = "-".charCodeAt(0);
/** Represents a blob error which is introduced in RESP3. */
export const BlobErrorReplyCode = "!".charCodeAt(0);
/** Represents a map which is introduced in RESP3. */
export const MapReplyCode = "%".charCodeAt(0);
/** Represents a set which is introduced in RESP3. */
export const SetReplyCode = "~".charCodeAt(0);
/** Represents a boolean which is introduced in RESP3. */
export const BooleanReplyCode = "#".charCodeAt(0);
/** Represents a big number which is introduced in RESP3. */
export const BigNumberReplyCode = "(".charCodeAt(0);
/** Represents the null type which is introduced in RESP3. */
export const NullReplyCode = "_".charCodeAt(0);
