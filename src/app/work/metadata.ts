import type { Metadata } from "next";
import type { Item } from "@/lib/collections/defineCollection";

// Case studies stay out of the index while the voyage they belong to is unlaunched —
// see `src/app/voyage/page.tsx` (robots there); flip both together at launch.
const ROBOTS = { index: false, follow: false } as const;

/**
 * Pure metadata builder for /work/[slug]. Split out of page.tsx so it is unit-testable
 * without pulling the server component (and next/image) into the vitest node env.
 * `cs` is a raw CMS Item, so every field is `FieldValue | undefined` — coerce defensively.
 */
export function buildCaseStudyMetadata(cs: Item | null): Metadata {
  // Missing/unpublished: the page will notFound(), but Next still calls this first —
  // so this branch carries the robots directive too.
  if (!cs) return { title: "Case study", robots: ROBOTS };
  const title = String(cs.title ?? "").trim() || "Case study";
  // Context is the one-line summary; fall back to the client name, then to nothing.
  const description = String(cs.context ?? "").trim() || String(cs.client ?? "").trim();
  return description
    ? { title, description, robots: ROBOTS, openGraph: { title, description } }
    : { title, robots: ROBOTS, openGraph: { title } };
}
