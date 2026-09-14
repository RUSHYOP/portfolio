// Thin route file: persist a new services ordering, handled by the generic factory.
import { services } from "@/lib/collections";
import { reorderRoute } from "@/lib/collections/routeHandlers";

export const { PUT } = reorderRoute(services);
