import type { CollectionDef } from "../fieldSpec";

// The engagement process, rendered as an ordered sequence on /voyage.
export const processStepsDef: CollectionDef = {
  name: "ProcessStep",
  collection: "processsteps",
  idPrefix: "step",
  fields: {
    title: { type: "text", label: "Step title", required: true, max: 60 },
    what: { type: "textarea", label: "What happens", required: true, max: 600 },
    deliverable: { type: "textarea", label: "What you get", max: 400 },
    duration: { type: "text", label: "How long", max: 40 },
  },
  orderable: true,
  publishable: false,
  publicList: true,
  searchable: ["title", "what"],
  revalidate: ["/voyage"],
};
