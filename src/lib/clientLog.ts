export type LogEvent = "quality.tier" | "quality.probe" | "scene.context_lost";

/** Logs to the console as one JSON line and fire-and-forgets to /api/logs. */
export function logClient(event: LogEvent, data: Record<string, unknown> = {}): void {
  const record = { event, ...data };
  console.info(JSON.stringify(record));
  if (typeof fetch !== "function") return;
  try {
    void fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from logging */
  }
}
