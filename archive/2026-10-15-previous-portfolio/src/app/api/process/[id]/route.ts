// Thin route file: read/update/delete one process item, handled by the generic factory.
import { processSteps } from "@/lib/collections";
import { byId } from "@/lib/collections/routeHandlers";

export const { GET, PUT, DELETE } = byId(processSteps);
