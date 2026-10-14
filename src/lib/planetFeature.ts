// The planet feature a case study asks for (slice 5). Pure on purpose: the scene (client) and
// worldCase.ts (server) both import it, so it must not pull in mongoose, marked or the logger.
import { PLANET_FEATURES } from "./collections/specs/caseStudies";

export type PlanetFeature = "none" | "ring" | "moon" | "storm";

// Derived from the CMS select's own option list, so a value added there is known here.
const KNOWN: readonly string[] = PLANET_FEATURES.map((o) => o.value);

/** Narrows an untrusted CMS value; anything that is not a known feature is `none` (spec §6). */
export function toPlanetFeature(value: unknown): PlanetFeature {
  return typeof value === "string" && KNOWN.includes(value) ? (value as PlanetFeature) : "none";
}
