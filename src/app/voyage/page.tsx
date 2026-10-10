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
  // One Promise.all for everything /voyage renders; servicesDef.revalidate already targets
  // this route on a CMS write. Only `services` is threaded through — later slices add
  // their own prop rather than carrying four unused ones.
  const { services, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} />;
}
