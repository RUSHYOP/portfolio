import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "https://rushy.dev";
  return ["", "/projects"].map((path) => ({
    url: `${url}${path}`,
    changeFrequency: "monthly",
    priority: path ? 0.8 : 1,
  }));
}
