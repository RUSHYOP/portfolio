import type { MetadataRoute } from "next";
import { portfolioProjects } from "@/lib/portfolio";
export const revalidate = 300;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "https://rushy.dev";
  const projects = await portfolioProjects();
  return ["", "/projects", ...projects.map((p) => `/projects/${p.slug}`)].map(
    (path) => ({
      url: `${url}${path}`,
      changeFrequency: "monthly",
      priority: path ? 0.8 : 1,
    }),
  );
}
