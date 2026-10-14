// Seed guard (slice 5). The placeholder case studies are PUBLISHED, so they must never reach a
// real database by accident. Pure, and under src/ (not scripts/) so vitest collects its tests;
// scripts/seed.ts imports it. Relative imports only: tsx runs the script.

/** The only hosts that count as "this machine". Anything else — including `localhost.` with a
 *  trailing dot, `127.0.0.1.nip.io`, `0.0.0.0` — is remote on purpose (fail closed). */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The explicit opt-in for seeding the placeholders into a non-local database. */
export const PLACEHOLDERS_FLAG = "--placeholders";

/**
 * May the seed write the published placeholder case studies? True when `--placeholders` is in
 * `argv`, or when EVERY host in a plain `mongodb://` URI is local. Fails closed: an absent,
 * empty or unparsable URI, a `mongodb+srv://` URI (SRV hosts are never local) and a host list
 * that mixes local and remote hosts are all false.
 *
 * The host list is `host[:port][,host[:port]...]` after optional `user:password@`. Credentials
 * must be percent-encoded in a valid URI, so the first `@` ends them; a raw `@` in a password
 * therefore just makes the "host" something non-local, which is false.
 */
export function canSeedPlaceholders(uri: string | undefined, argv: readonly string[]): boolean {
  if (argv.includes(PLACEHOLDERS_FLAG)) return true;
  if (typeof uri !== "string") return false;
  const match = /^mongodb:\/\/(?:[^@/?#]*@)?([^/?#]+)/i.exec(uri.trim());
  if (!match) return false;
  return match[1].split(",").every((host) => LOCAL_HOSTS.has(host.replace(/:\d+$/, "").toLowerCase()));
}
