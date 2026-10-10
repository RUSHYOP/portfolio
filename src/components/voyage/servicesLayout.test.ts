import { expect, it } from "vitest";
import type { Item } from "@/lib/collections/defineCollection";
import { readService } from "./servicesLayout";
it("preserves authored outcome order and safely narrows optional CMS fields", () => {
  const item = { title: "  Strategy  ", promise: null, outcomes: ["Second", 4, "First"], engagement: {} } as unknown as Item;
  expect(readService(item)).toEqual({ title: "Strategy", promise: "", outcomes: ["Second", "First"], engagement: "" });
});
