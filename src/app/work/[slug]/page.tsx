import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseStudyBySlug, getPublishedCaseStudySlugs } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";
import { buildCaseStudyMetadata } from "../metadata";
import "../work.css";

// ISR: matches /voyage. `revalidatePath("/work/[slug]")` (fired by the case-study API)
// busts this ahead of the window, so publish/unpublish is reflected immediately.
export const revalidate = 300;
// Studies published after the last build must still render, not 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedCaseStudySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return buildCaseStudyMetadata(await getCaseStudyBySlug(slug));
}

// Fixed narrative order; each section is skipped when its markdown is empty.
const SECTIONS = [
  ["problem", "Problem"],
  ["architecture", "Architecture"],
  ["outcome", "Outcome"],
] as const;

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Returns null for unknown *and* unpublished slugs — both are a 404 to the public.
  const cs = await getCaseStudyBySlug(slug);
  if (!cs) notFound();

  const stack = Array.isArray(cs.stack) ? cs.stack : [];
  const metrics = Array.isArray(cs.metrics) ? cs.metrics : [];
  const title = String(cs.title ?? "");

  return (
    <main className="work">
      <Link href="/voyage#worlds" className="work__back">
        ← Back to the voyage
      </Link>
      <header className="work__header">
        <p className="work__eyebrow">Case study{cs.client ? ` · ${String(cs.client)}` : ""}</p>
        <h1 className="work__title">{title}</h1>
        {cs.context ? <p className="work__context">{String(cs.context)}</p> : null}
        {metrics.length > 0 && (
          <ul className="work__metrics" aria-label="Key metrics">
            {metrics.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        {stack.length > 0 && (
          <ul className="work__stack" aria-label="Stack">
            {stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        )}
      </header>
      {cs.diagram ? (
        <figure className="work__diagram">
          {/* Served by our own /api/media/<id> route (no external loader), so `unoptimized`
              keeps next/image from proxying an already-sized upload through the optimiser. */}
          <Image
            src={String(cs.diagram)}
            alt={`${title} architecture diagram`}
            width={1600}
            height={1200}
            unoptimized
            // It sits directly under the header and is the LCP element on mobile —
            // Next warns if this loads lazily.
            priority
          />
        </figure>
      ) : null}
      {SECTIONS.map(([key, heading]) => {
        // renderMarkdown is the only path CMS markdown takes to the DOM; it sanitises
        // and returns "" for empty input, which collapses the whole section.
        const html = renderMarkdown(String(cs[key] ?? ""));
        if (!html) return null;
        return (
          <section key={key} className="work__section">
            <h2 className="work__h2">{heading}</h2>
            {/* Safe by construction: the only source of __html is renderMarkdown's
                sanitise-html output. (No eslint-disable — react/no-danger is not enabled
                here, and an unused directive is itself a lint warning.) */}
            <div className="work__prose" dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        );
      })}
    </main>
  );
}
