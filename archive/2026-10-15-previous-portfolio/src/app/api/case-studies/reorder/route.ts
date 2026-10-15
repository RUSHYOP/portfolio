// Thin route file: persist a new case-studies ordering, handled by the generic factory.
import { caseStudies } from "@/lib/collections";
import { reorderRoute } from "@/lib/collections/routeHandlers";

export const { PUT } = reorderRoute(caseStudies);
