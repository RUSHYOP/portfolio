import type { CollectionDef } from "../fieldSpec";

// Consulting services shown on /voyage. Always visible (no publish toggle), hand-ordered.
export const servicesDef: CollectionDef = {
  name: "Service",
  collection: "services",
  idPrefix: "svc",
  fields: {
    title: { type: "text", label: "Title", required: true, max: 120 },
    promise: { type: "text", label: "Promise (one line)", required: true, max: 200 },
    outcomes: { type: "chips", label: "Outcomes", maxItems: 4, max: 80, help: "1–4 short outcome bullets" },
    engagement: { type: "text", label: "Typical engagement", max: 120 },
  },
  orderable: true,
  publishable: false,
  publicList: true,
  searchable: ["title", "promise"],
  revalidate: ["/voyage"],
};
