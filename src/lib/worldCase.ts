// Server-side mapper from a published case-study Item to the slim DTO the /voyage client
// receives (slice 5). It imports markdown.ts (marked, sanitize-html, the logger) as a VALUE, so
// it is server-only: client components may only `import type { WorldCase }` from here — the
// established pattern, erased at compile time. The client never receives a full markdown body.
import type { Item } from "./collections/defineCollection";
import { caseExcerpt, EXCERPT_MAX } from "./markdown";
import { toPlanetFeature, type PlanetFeature } from "./planetFeature";

export interface WorldCase {
  id: string;
  slug: string;
  title: string;
  client: string;
  context: string;
  stack: string[];
  /** Image URL (`/api/media/<id>` or a static path); empty when the case has no diagram. */
  diagram: string;
  planetFeature: PlanetFeature;
  /** First paragraph of each markdown section as plain text, cut at a word boundary. */
  excerpts: { problem: string; architecture: string; outcome: string };
}

// `Item` is untyped past its three base fields, and the CMS is data: narrow every read.
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function toWorldCase(item: Item): WorldCase {
  return {
    id: item.id,
    slug: str(item.slug),
    title: str(item.title),
    client: str(item.client),
    context: str(item.context),
    stack: Array.isArray(item.stack) ? item.stack.filter((s): s is string => typeof s === "string") : [],
    diagram: str(item.diagram),
    planetFeature: toPlanetFeature(item.planetFeature),
    excerpts: {
      problem: caseExcerpt(str(item.problem), EXCERPT_MAX),
      architecture: caseExcerpt(str(item.architecture), EXCERPT_MAX),
      outcome: caseExcerpt(str(item.outcome), EXCERPT_MAX),
    },
  };
}
