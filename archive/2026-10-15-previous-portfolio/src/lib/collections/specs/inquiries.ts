import type { CollectionDef, SelectOption } from "../fieldSpec";

export const BUDGET_OPTIONS: readonly SelectOption[] = [
  { value: "lt5k", label: "Under $5k" },
  { value: "5to15k", label: "$5k – $15k" },
  { value: "15to40k", label: "$15k – $40k" },
  { value: "40kplus", label: "$40k+" },
  { value: "undecided", label: "Undecided" },
];

export const TIMELINE_OPTIONS: readonly SelectOption[] = [
  { value: "asap", label: "ASAP" },
  { value: "1to3m", label: "1–3 months" },
  { value: "3mplus", label: "3+ months" },
  { value: "exploring", label: "Just exploring" },
];

export const STATUS_OPTIONS: readonly SelectOption[] = [
  { value: "new", label: "New" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

// Contact-form submissions: written by the public, read only by the admin.
// status/ipHash/notifyFailed are `internal` — the validator rejects them from any body.
export const inquiriesDef: CollectionDef = {
  name: "Inquiry",
  collection: "inquiries",
  idPrefix: "inq",
  fields: {
    name: { type: "text", label: "Name", required: true, max: 120 },
    email: { type: "text", label: "Email", required: true, max: 200 },
    building: { type: "textarea", label: "What are you building?", required: true, max: 2000 },
    budget: { type: "select", label: "Budget", required: true, options: BUDGET_OPTIONS },
    timeline: { type: "select", label: "Timeline", required: true, options: TIMELINE_OPTIONS },
    status: { type: "select", label: "Status", options: STATUS_OPTIONS, default: "new", internal: true },
    ipHash: { type: "text", label: "IP hash", max: 64, internal: true },
    notifyFailed: { type: "toggle", label: "Notification failed", default: false, internal: true },
  },
  orderable: false,
  publishable: false,
  publicList: false,
  searchable: ["name", "email", "building"],
  revalidate: [],
};
