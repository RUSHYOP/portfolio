import type { Metadata } from "next";
import { getVoyageContent } from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Voyage",
  robots: { index: false, follow: false },
};

export default async function VoyagePage() {
  // One Promise.all for everything /voyage renders; servicesDef.revalidate and
  // processStepsDef.revalidate already target this route on a CMS write. `services` (ch. 02)
  // and `process` (ch. 04) are threaded through — later slices add their own prop rather than
  // carrying unused ones. Destructured as `steps` so it never shadows Node's `process` global.
  const { services, process: steps, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} process={steps} />;
}
