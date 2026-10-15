// Thin route file: list/create for the case-studies collection, handled by the generic factory.
import { caseStudies } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";

export const { GET, POST } = listAndCreate(caseStudies);
