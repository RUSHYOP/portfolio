// Thin route file: read/update/delete one case-studies item, handled by the generic factory.
import { caseStudies } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";

export const { GET, PUT, DELETE } = byId(caseStudies);
