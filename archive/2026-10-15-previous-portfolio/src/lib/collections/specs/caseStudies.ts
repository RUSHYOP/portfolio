import type { CollectionDef, SelectOption } from "../fieldSpec";

// Visual treatment of the case study's planet in the /voyage scene.
export const PLANET_FEATURES: readonly SelectOption[] = [
  { value: "none", label: "None" },
  { value: "ring", label: "Ring" },
  { value: "moon", label: "Moon" },
  { value: "storm", label: "Storm band" },
];

// Long-form work. Publishable (drafts stay hidden) and slug-addressed at /work/<slug>.
export const caseStudiesDef: CollectionDef = {
  name: "CaseStudy",
  collection: "casestudies",
  idPrefix: "case",
  fields: {
    slug: { type: "slug", label: "Slug", required: true, max: 80, help: "URL: /work/<slug>. Changing it breaks old links." },
    title: { type: "text", label: "Title", required: true, max: 120 },
    client: { type: "text", label: "Client", max: 80 },
    context: { type: "text", label: "Context (one line)", max: 200 },
    problem: { type: "markdown", label: "Problem", max: 6000 },
    architecture: { type: "markdown", label: "Architecture", max: 6000 },
    outcome: { type: "markdown", label: "Outcome", max: 6000 },
    stack: { type: "chips", label: "Stack", maxItems: 12, max: 40 },
    metrics: { type: "chips", label: "Metrics", maxItems: 6, max: 60, help: 'e.g. "p95 120ms", "3 → 0 incidents"' },
    diagram: { type: "image", label: "Architecture diagram" },
    planetFeature: { type: "select", label: "Planet feature", options: PLANET_FEATURES, default: "none" },
  },
  orderable: true,
  publishable: true,
  publicList: true,
  searchable: ["title", "client", "context"],
  revalidate: ["/voyage", "/work/[slug]"],
};
