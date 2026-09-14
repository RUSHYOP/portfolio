// Thin route file: persist a new process ordering, handled by the generic factory.
import { processSteps } from "@/lib/collections";
import { reorderRoute } from "@/lib/collections/routeHandlers";

export const { PUT } = reorderRoute(processSteps);
