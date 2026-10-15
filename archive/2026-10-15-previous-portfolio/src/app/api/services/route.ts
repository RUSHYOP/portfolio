// Thin route file: list/create for the services collection, handled by the generic factory.
import { services } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";

export const { GET, POST } = listAndCreate(services);
