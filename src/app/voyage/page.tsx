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
  // One Promise.all for everything /voyage renders; collection revalidation targets
  // this route on CMS writes.
  const { services, process, settings } = await getVoyageContent();
  return <VoyageRoot settings={settings} services={services} process={process} />;
}
