import type { Metadata } from "next";
import { getVoyageContent } from "@/lib/data";
import { toWorldCase } from "@/lib/worldCase";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Voyage",
  robots: { index: false, follow: false },
};

export default async function VoyagePage() {
  // One Promise.all for everything /voyage renders; servicesDef.revalidate and
  // processStepsDef.revalidate already target this route on a CMS write. `services` (ch. 02),
  // `process` (ch. 04) and `worlds` (ch. 05) are threaded through — later slices add their own
  // prop rather than carrying unused ones. Destructured as `steps` so it never shadows Node's
  // `process` global. The case studies are mapped to the slim WorldCase HERE, on the server: the
  // client never receives a full markdown body (the three excerpts replace up to 18 000 chars).
  const { services, process: steps, caseStudies, settings } = await getVoyageContent();
  const worlds = caseStudies.map(toWorldCase);
  return <VoyageRoot settings={settings} services={services} process={steps} worlds={worlds} />;
}
