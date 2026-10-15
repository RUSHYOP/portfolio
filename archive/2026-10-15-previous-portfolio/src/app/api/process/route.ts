// Thin route file: list/create for the process collection, handled by the generic factory.
import { processSteps } from "@/lib/collections";
import { listAndCreate } from "@/lib/collections/routeHandlers";

export const { GET, POST } = listAndCreate(processSteps);
