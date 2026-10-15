/**
 * Client-safe collection definitions.
 *
 * `./index` builds the Mongoose-backed collections and so can never be imported from a
 * client component. Every `./specs/*` module imports only types from `./fieldSpec`, so this
 * barrel is pure data — the admin UI imports defs from here, `./index` re-exports ALL_DEFS
 * from here, and there is exactly one source of truth.
 */
import type { CollectionDef } from "./fieldSpec";

export { servicesDef } from "./specs/services";
export { processStepsDef } from "./specs/processSteps";
export { caseStudiesDef, PLANET_FEATURES } from "./specs/caseStudies";
export { testimonialsDef } from "./specs/testimonials";
export { inquiriesDef, BUDGET_OPTIONS, TIMELINE_OPTIONS, STATUS_OPTIONS } from "./specs/inquiries";

import { servicesDef } from "./specs/services";
import { processStepsDef } from "./specs/processSteps";
import { caseStudiesDef } from "./specs/caseStudies";
import { testimonialsDef } from "./specs/testimonials";
import { inquiriesDef } from "./specs/inquiries";

/** Keyed by API path segment — the admin uses this to build field forms and URLs. */
export const ALL_DEFS = {
  services: servicesDef,
  process: processStepsDef,
  "case-studies": caseStudiesDef,
  testimonials: testimonialsDef,
  inquiries: inquiriesDef,
} as const satisfies Record<string, CollectionDef>;

/** API path segment of a collection, e.g. "case-studies". */
export type CollectionKey = keyof typeof ALL_DEFS;
