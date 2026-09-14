import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage.css";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Voyage",
  robots: { index: false, follow: false },
};

export default async function VoyagePage() {
  const settings = await getSettings();
  return <VoyageRoot settings={settings} />;
}
