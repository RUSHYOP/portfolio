import { promises as fs } from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");

/** Append one JSON line to logs/<name>.jsonl. Silently no-ops on read-only filesystems (Vercel). */
export async function appendLog(name: string, record: Record<string, unknown>): Promise<void> {
  const safe = name.replace(/[^a-z0-9_-]/gi, "_");
  const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + "\n";
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(path.join(LOG_DIR, `${safe}.jsonl`), line, "utf8");
  } catch {
    // read-only FS or permissions — logging must never break a request
  }
}
