/**
 * Best-effort client IP from proxy headers: `x-real-ip` first, else the first hop of
 * `x-forwarded-for`, else the shared `"unknown"` bucket (local dev sets neither).
 *
 * Trusted because this app is deployed only behind Vercel's edge, which overwrites these
 * headers; if ever self-hosted behind a non-sanitising proxy, revisit — a client could then
 * spoof either header and escape any per-IP bucketing built on this value.
 */
export function clientIp(request: { headers: Headers }): string {
  const real = (request.headers.get("x-real-ip") ?? "").trim();
  if (real) return real;
  const forwarded = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return forwarded || "unknown";
}
