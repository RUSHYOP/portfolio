import type { CollectionDef } from "../fieldSpec";

// Client quotes on /voyage. Publishable so a quote can be staged before approval lands.
export const testimonialsDef: CollectionDef = {
  name: "Testimonial",
  collection: "testimonials",
  idPrefix: "tst",
  fields: {
    quote: { type: "textarea", label: "Quote", required: true, max: 400 },
    name: { type: "text", label: "Name", required: true, max: 80 },
    role: { type: "text", label: "Role", max: 80 },
    company: { type: "text", label: "Company", max: 80 },
  },
  orderable: true,
  publishable: true,
  publicList: true,
  searchable: ["quote", "name", "company"],
  revalidate: ["/voyage"],
};
