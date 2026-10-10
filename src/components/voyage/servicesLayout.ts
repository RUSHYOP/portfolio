import type { Item } from "@/lib/collections/defineCollection";

/** Normalize optional CMS fields without changing authored order. */
export function readService(item: Item) {
  return {
    title: typeof item.title === "string" ? item.title.trim() : "",
    promise: typeof item.promise === "string" ? item.promise : "",
    outcomes: Array.isArray(item.outcomes)
      ? item.outcomes.filter((o): o is string => typeof o === "string")
      : [],
    engagement: typeof item.engagement === "string" ? item.engagement : "",
  };
}
