// Pure hash -> scroll-target mapping for a /voyage#<chapter> arrival (slice 5, A9). Kept out of
// VoyageRoot so it can be unit-tested: the elements it names (`id="worlds"`, ...) only exist
// after VoyageRoot's `tier === null` boot gate, so the browser's own fragment jump and Next's
// post-navigation scroll both miss them and the reader lands at the top. VoyageRoot calls this
// once, when the tier resolves, and scrolls there itself.
import { CONTENT_CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

/** Every dock, rail and CTA arrival lands this far past a chapter's start (absolute progress),
 *  so the pinned content is already up and the chapter's own beat has begun. */
export const HASH_ARRIVAL_EPS = 0.001;

/**
 * The content chapter a location hash names (`#worlds` or `worlds`), or null. Micro-beats
 * (Jump, Dark Passage) have no pin and nothing to land on, so they are null too; matching is
 * exact and case-sensitive, like the browser's own fragment lookup. A percent-encoded id is
 * decoded; a malformed one is null, never a throw.
 */
export function chapterForHash(hash: string): ChapterId | null {
  if (typeof hash !== "string") return null;
  let id = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    id = decodeURIComponent(id);
  } catch {
    return null;
  }
  return CONTENT_CHAPTERS.find((c) => c.id === id)?.id ?? null;
}

/** Absolute progress to scroll to for a hash: the named chapter's start + HASH_ARRIVAL_EPS, or null. */
export function hashArrivalProgress(hash: string): number | null {
  const id = chapterForHash(hash);
  if (id === null) return null;
  return CONTENT_CHAPTERS.find((c) => c.id === id)!.start + HASH_ARRIVAL_EPS;
}
