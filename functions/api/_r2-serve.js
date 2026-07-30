// Shared R2 Range-request serving, extracted from worker.js's original /media/
// block so /api/asset (Workstream B) can reuse the exact same byte-range
// behavior without duplicating it. Behavior is unchanged from the original
// inline code — this is a pure extraction. (_-prefixed → not a route.)

export function parseRange(rangeHeader) {
  if (!rangeHeader) return undefined;
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!m) return undefined;
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? parseInt(m[2], 10) : undefined;
  if (start < 0 || (end !== undefined && end < start)) return undefined;
  return end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start };
}

// Fetch `key` from the R2 binding and return an HTTP Response with Range
// support, or null if the object doesn't exist. `cacheControl` lets callers
// choose public-immutable (the /media/ prefix) vs private (the /api/asset
// prefix, since access there is per-user, not per-URL).
export async function serveR2Object(env, request, key, { cacheControl = "public, max-age=31536000, immutable" } = {}) {
  const range = parseRange(request.headers.get("range"));
  const obj = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!obj) return null;
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", cacheControl);
  if (obj.range) {
    const s = obj.range.offset || 0;
    const len = obj.range.length != null ? obj.range.length : obj.size - s;
    headers.set("content-range", `bytes ${s}-${s + len - 1}/${obj.size}`);
    headers.set("content-length", String(len));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}
