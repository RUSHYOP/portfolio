// Thin route file: read/update/delete one services item, handled by the generic factory.
import { services } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";

export const { GET, PUT, DELETE } = byId(services);
