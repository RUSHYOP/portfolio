import { promises as fs } from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");

/**
 * Append one JSON line to logs/<name>.jsonl. When that write fails (read-only FS on
 * Vercel, permissions), the same line is mirrored to stdout so the record still reaches
 * the platform's function logs. Never throws.
 */
export async function appendLog(name: string, record: Record<string, unknown>): Promise<void> {
  const safe = name.replace(/[^a-z0-9_-]/gi, "_");
  // F1: `name` is carried inside the payload too — stdout has no per-file separation.
  // ts last: the server clock is authoritative, a client-supplied ts must not win.
  const payload = { name: safe, ...record, ts: new Date().toISOString() };
  const line = JSON.stringify(payload) + "\n";
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(path.join(LOG_DIR, `${safe}.jsonl`), line, "utf8");
  } catch {
    // Read-only FS (Vercel): stdout is the only sink that reaches the function logs.
    // This is the ONE sanctioned console.* call in app code — see CLAUDE.md.
    console.log(JSON.stringify(payload));
  }
}
