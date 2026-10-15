// Thin route file: persist a new testimonials ordering, handled by the generic factory.
import { testimonials } from "@/lib/collections";
import { reorderRoute } from "@/lib/collections/routeHandlers";

export const { PUT } = reorderRoute(testimonials);
