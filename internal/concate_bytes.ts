export function concateBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length === 0) return b;
  const size = a.length + b.length;
  const buf = new Uint8Array(size);
  buf.set(a);
  buf.set(b, a.length);
  return buf;
}
