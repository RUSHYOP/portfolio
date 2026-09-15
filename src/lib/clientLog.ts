/** Single source of truth for the client event names the /api/logs route accepts. */
// Task 10: admin.* events let the CMS admin report upload/mutation failures through the
// structured log pipeline instead of console.*.
export const LOG_EVENTS = [
  "quality.tier",
  "quality.probe",
  "scene.context_lost",
  "admin.upload_failed",
  "admin.save_failed",
] as const;

export type LogEvent = (typeof LOG_EVENTS)[number];

/**
 * Logs to the console as one JSON line and fire-and-forgets to /api/logs.
 * Every step — including the JSON.stringify — is inside the try, so unserializable
 * data (circular refs, BigInt) can never break the caller.
 */
export function logClient(event: LogEvent, data: Record<string, unknown> = {}): void {
  try {
    // Stringify once and reuse for both sinks so console and server see the same line.
    const line = JSON.stringify({ event, ...data });
    console.info(line);
    if (typeof fetch !== "function") return;
    void fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from logging */
  }
}
