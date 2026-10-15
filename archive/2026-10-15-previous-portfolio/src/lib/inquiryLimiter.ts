import { createRateLimiter } from "@/lib/rateLimit";

// 5 submissions per IP-hash per rolling hour. Module-level so it survives across
// requests within one server instance; Next route files may export only handlers,
// so the limiter (and its test-only reset) live in this dedicated module.
const make = () => createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });
let limiter = make();

export function checkInquiryLimit(key: string) {
  return limiter.check(key);
}

/** Test-only: start a fresh window so tests don't leak rate-limit state across cases. */
export function resetInquiryLimiter() {
  limiter = make();
}
