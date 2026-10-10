import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import type { Settings } from "@/lib/data";
import type { Item } from "@/lib/collections/defineCollection";
import VoyageRoot from "./VoyageRoot";

it("serves one readable hero and intrinsic Services without waiting for a tier or scene", () => {
  const settings = { heroHeadline: "Build thoughtful AI-powered products", heroSubheadline: "Actual supporting copy" } as Settings;
  const services = [{ id: "one", order: 0, createdAt: "", title: "One service", promise: "Actual promise" }] as Item[];
  const html = renderToString(<VoyageRoot settings={settings} services={services} />);
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html.match(/One service<\/h2>/g)).toHaveLength(1);
  expect(html).toContain("Actual supporting copy");
  expect(html).toContain("Actual promise");
  expect(html).toContain('class="voyage-track"');
  expect(html).not.toContain('class="ignition"');
  expect(html).not.toContain('voyage-root--booting');
  expect(html).not.toContain('min-height:1350vh');
  expect(html).not.toMatch(/class="launch"[^>]*opacity:0/);
  expect(html).not.toMatch(/id="approach"[^>]*height:/);
  expect(html).toContain("Discuss a project");
});
