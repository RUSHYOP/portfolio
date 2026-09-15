import type { Metadata } from "next";
import type { Item } from "@/lib/collections/defineCollection";

/**
 * Pure metadata builder for /work/[slug]. Split out of page.tsx so it is unit-testable
 * without pulling the server component (and next/image) into the vitest node env.
 * `cs` is a raw CMS Item, so every field is `FieldValue | undefined` — coerce defensively.
 */
export function buildCaseStudyMetadata(cs: Item | null): Metadata {
  // Missing/unpublished: the page will notFound(), but Next still calls this first.
  if (!cs) return { title: "Case study" };
  const title = String(cs.title ?? "").trim() || "Case study";
  // Context is the one-line summary; fall back to the client name, then to nothing.
  const description = String(cs.context ?? "").trim() || String(cs.client ?? "").trim();
  return description ? { title, description } : { title };
}
