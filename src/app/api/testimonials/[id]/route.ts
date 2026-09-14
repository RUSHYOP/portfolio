// Thin route file: read/update/delete one testimonials item, handled by the generic factory.
import { testimonials } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";

export const { GET, PUT, DELETE } = byId(testimonials);
