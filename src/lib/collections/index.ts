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

// ALL_DEFS lives in ./defs (mongoose-free) so client components can import it; re-exported
// here so server-side consumers keep one import site and the two can never drift.
export { ALL_DEFS, type CollectionKey } from "./defs";
