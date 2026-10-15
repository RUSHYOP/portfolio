// Thin route file: list/create for the testimonials collection, handled by the generic factory.
import { testimonials } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";

export const { GET, POST } = listAndCreate(testimonials);
