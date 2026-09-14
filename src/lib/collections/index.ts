import { defineCollection } from "./defineCollection";
import { servicesDef } from "./specs/services";
import { processStepsDef } from "./specs/processSteps";
import { caseStudiesDef } from "./specs/caseStudies";
import { testimonialsDef } from "./specs/testimonials";
import { inquiriesDef } from "./specs/inquiries";

export const services = defineCollection(servicesDef);
export const processSteps = defineCollection(processStepsDef);
export const caseStudies = defineCollection(caseStudiesDef);
export const testimonials = defineCollection(testimonialsDef);
export const inquiries = defineCollection(inquiriesDef);

/** Keyed by API path segment — the admin uses this to build field forms and URLs. */
export const ALL_DEFS = {
  services: servicesDef,
  process: processStepsDef,
  "case-studies": caseStudiesDef,
  testimonials: testimonialsDef,
  inquiries: inquiriesDef,
} as const;
