// Placeholder case studies (slice 5, D1). Chapter 05 is built and reviewed against these three —
// one per planet feature — until the owner replaces them through /admin. They are PUBLISHED, so
// scripts/seed.ts only writes them behind seedGuard.canSeedPlaceholders. Every slug starts with
// `placeholder-` and every title says so, so a stray one is unmistakable on a live site.
// Pure data plus one function; relative imports only because tsx runs the seed script.
import type { Collection } from "./collections/defineCollection";
import type { FieldValue } from "./collections/fieldSpec";
import { canSeedPlaceholders } from "./seedGuard";

export type PlaceholderCase = Record<string, FieldValue>;

/** Markdown sections are written as paragraphs joined by a blank line. */
const md = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const PLACEHOLDER_CASES: readonly PlaceholderCase[] = [
  {
    slug: "placeholder-ledger",
    title: "Placeholder: a payments ledger without the monolith",
    client: "Placeholder client (fintech)",
    context: "Moving a payments ledger out of a shared database with no downtime and no double postings.",
    problem: md(
      "The ledger was a set of tables inside the main application database. Every feature team wrote to it directly, so a schema change was a company-wide release and a slow query anywhere could stall postings everywhere. At roughly 40 transactions per second it had no headroom left, and month-end reconciliation took two engineers most of a week.",
      "The brief was strict: **no downtime**, no double postings, and an audit trail a regulator could replay. A one-shot rewrite was ruled out in the first meeting. The migration had to be something the team could stop, inspect and resume at any point.",
      "Success meant one owner for ledger writes, a measurable drop in posting latency, and a reconciliation that finished before the finance team arrived on Monday.",
    ),
    architecture: md(
      "An append-only event log became the ledger's source of truth, with balances and statements as projections rebuilt from it. Writes go through a single posting service that checks the double-entry invariants before anything is committed.",
      "The cutover used a dual-write phase with a comparator: every posting was written to both systems and diffed, and the old path stayed authoritative until the diff had been empty for 14 days. Projections are idempotent consumers, so replaying a day of events is always safe.",
      "Backpressure and retries are explicit. A poison event parks in a dead-letter stream with its full context instead of blocking a partition, and an on-call runbook says how to release it.",
    ),
    outcome: md(
      "Posting p95 fell from 480 ms to 120 ms and the ledger now carries ten times the old peak without tuning. Reconciliation runs nightly and finishes in minutes, so month-end is a review rather than a project.",
      "The team has shipped four schema changes to the ledger since the cutover without a release freeze.",
    ),
    stack: ["Go", "Kafka", "Postgres", "Kubernetes", "OpenTelemetry"],
    metrics: ["p95 480 to 120 ms", "10x peak headroom", "0 double postings"],
    planetFeature: "ring",
    published: true,
  },
  {
    slug: "placeholder-routing",
    title: "Placeholder: dispatch routing that survives a bad day",
    client: "Placeholder client (logistics)",
    context: "Rebuilding a route-planning service so one failed depot no longer stalls the whole fleet.",
    problem: md(
      "Route planning ran as one nightly batch job against a single solver. When a depot lost its connection, or a driver called in sick, the plan was stale until the next run, and dispatchers fixed it by hand in a spreadsheet. On a bad day that meant two hours of phone calls before the first van left.",
      "The business wanted plans that adapted in minutes, a dispatcher who could see why the solver made a choice, and no new single point of failure.",
    ),
    architecture: md(
      "Planning became an event-driven service: depots, vehicles and orders are streams, and a re-plan is triggered by a change rather than by the clock. Each depot is solved as an independent region, so a failure is contained to the region that owns it.",
      "The solver is wrapped behind a time budget. It returns the best feasible plan it has at the deadline together with a short explanation of the constraints that bound it, which the dispatcher UI shows next to the route.",
      "A read-only replica of the planning state sits beside the live service, so the support team can query routes and the reasons behind them without touching the solver.",
    ),
    outcome: md(
      "Re-planning after a depot outage dropped from about two hours to under four minutes. Dispatchers override the solver far less often, and when they do the override is recorded with a reason, which has already improved the cost model twice.",
      "The service has run through three regional outages without a manual spreadsheet.",
    ),
    stack: ["TypeScript", "Node.js", "Redis Streams", "OR-Tools", "PostgreSQL", "Grafana"],
    metrics: ["2 h to 4 min re-plan", "3 outages absorbed", "-38% manual overrides"],
    planetFeature: "moon",
    published: true,
  },
  {
    slug: "placeholder-telemetry",
    title: "Placeholder: a telemetry pipeline for a noisy fleet",
    client: "Placeholder client (industrial IoT)",
    context: "Taming two million sensor messages a minute so that an alert finally means something.",
    problem: md(
      "Forty thousand devices reported every few seconds, and the monitoring stack alerted on every threshold crossing. Operators had learned to ignore the pager, which is exactly when a real fault slips through. Storage costs were also doubling every quarter.",
      "The goal was a pipeline that kept full fidelity for anything anomalous, summarised everything else, and produced alerts that a person could act on.",
    ),
    architecture: md(
      "Ingestion is a thin gateway that authenticates devices, rejects malformed frames at the edge and writes to a partitioned log. A stream processor keeps a rolling baseline per device and per site, and emits an event only when a reading leaves its own baseline, not a global threshold.",
      "Raw data lands in cheap object storage for 30 days and is downsampled after that. Alerts are grouped by probable cause, so one failed gateway raises one incident instead of four hundred.",
      "Every stage exposes its own lag and drop counters, so the pipeline's health is visible on the same dashboards as the fleet it watches.",
    ),
    outcome: md(
      "Alert volume fell by 94 percent while time to detect a real fault improved from hours to minutes. Storage growth flattened, and the on-call rotation went from dreaded to boring, which was the point.",
      "The baselines have since been reused for capacity planning, a use nobody had asked for at the start.",
    ),
    stack: ["Rust", "Kafka", "ClickHouse", "S3", "Prometheus", "Terraform"],
    metrics: ["-94% alerts", "2M msgs/min", "hours to minutes detection"],
    planetFeature: "storm",
    published: true,
  },
];

/** The slice of a Collection the seeding needs; a fake satisfies it in tests. */
export type CaseStore = Pick<Collection, "validate" | "getBySlug" | "create" | "update">;

export interface PlaceholderSeedResult {
  created: string[];
  updated: string[];
}

/**
 * Upserts the placeholders by slug, so the seed can be re-run: a missing slug is created, an
 * existing one is updated in place (its order is kept — a reseed never reorders). Everything is
 * validated before anything is written, so one bad literal fails the run with nothing half-done.
 * An existing document is validated in "update" mode, which only carries the keys the literal
 * lists: a field the literal omits is never rewritten, so a defaulted one (planetFeature, published)
 * that an owner edited through /admin keeps its value, where create mode would reset it to its
 * default. `diagram` has no spec default, so it is untouched in EITHER mode — the literals simply
 * omit it. Throws on an invalid literal. `published: true` is explicit: the synthesized toggle defaults
 * to false, and the voyage only reads published cases.
 */
export async function seedPlaceholderCases(
  store: CaseStore,
  cases: readonly PlaceholderCase[] = PLACEHOLDER_CASES,
): Promise<PlaceholderSeedResult> {
  const plan: { slug: string; existingId: string | null; value: Record<string, FieldValue> }[] = [];
  for (const doc of cases) {
    const slug = String(doc.slug);
    const existing = await store.getBySlug(slug);
    const v = store.validate(doc, existing ? "update" : "create");
    // The same validator the API uses: a literal that drifts from the spec must fail the seed.
    if (!v.ok) throw new Error(`placeholder case "${slug}" invalid: ${v.error}`);
    plan.push({ slug, existingId: existing ? existing.id : null, value: v.value });
  }
  const result: PlaceholderSeedResult = { created: [], updated: [] };
  for (const step of plan) {
    if (step.existingId) {
      await store.update(step.existingId, step.value);
      result.updated.push(step.slug);
    } else {
      await store.create(step.value);
      result.created.push(step.slug);
    }
  }
  return result;
}

export interface PlaceholderSeedOutcome {
  /** false when the guard refused: nothing was read or written. */
  ran: boolean;
  result?: PlaceholderSeedResult;
}

/**
 * The guarded entry the seed script calls: seeds the placeholders only when
 * `canSeedPlaceholders(uri, argv)` allows it, and says what it did through `log` (the script passes
 * `appendLog("seed", …)`). A refusal reads and writes nothing, logs an error and returns
 * `{ ran: false }` — the script maps that to a non-zero exit code. Store failures propagate.
 */
export async function seedPlaceholdersIfAllowed(opts: {
  uri: string | undefined;
  argv: readonly string[];
  store: CaseStore;
  log: (record: Record<string, unknown>) => Promise<void>;
  cases?: readonly PlaceholderCase[];
}): Promise<PlaceholderSeedOutcome> {
  if (!canSeedPlaceholders(opts.uri, opts.argv)) {
    await opts.log({
      level: "error",
      message: "refused to seed published placeholder case studies into a non-local database",
      hint: "target localhost / 127.0.0.1, or pass --placeholders to opt in",
    });
    return { ran: false };
  }
  const result = await seedPlaceholderCases(opts.store, opts.cases);
  await opts.log({ level: "info", message: "placeholder case studies seeded", ...result });
  return { ran: true, result };
}
