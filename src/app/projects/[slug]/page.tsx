import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import RamcoTenure from "@/components/RamcoTenure";
import {
  externalUrl,
  portfolioProjects,
  portfolioTimestamp,
} from "@/lib/portfolio";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await portfolioProjects()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = (await portfolioProjects()).find((p) => p.slug === slug);
  if (!project) return { title: "Project not found", robots: { index: false } };
  return {
    title: project.title,
    description: project.story.intro,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.story.intro,
      type: "article",
      url: `/projects/${project.slug}`,
    },
  };
}

export default async function ProjectArticle({ params }: Props) {
  const { slug } = await params;
  const projects = await portfolioProjects();
  const initialNow = await portfolioTimestamp();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();
  const project = projects[index];
  const { story } = project;
  const next = projects[(index + 1) % projects.length];
  const live = project.showLiveLink && externalUrl(project.liveLink);
  const code = project.showCodeLink && externalUrl(project.codeLink);
  return (
    <>
      <SiteHeader />
      <main id="main" className="project-article shell">
        <article>
          <header className="article-header" id="top">
            <Link className="text-link article-back" href="/projects">
              ← All work
            </Link>
            <div className="article-kicker eyebrow">
              <span>{project.title}</span>
              <span>{story.category}</span>
            </div>
            <h1>{story.headline}</h1>
            <p className="article-intro">{story.intro}</p>
            <div
              className={`article-facts${project.id === "ramco-profile" ? " article-profile-facts" : ""}`}
            >
              <div>
                <span className="eyebrow">CONTEXT</span>
                <p>{story.context}</p>
              </div>
              <div>
                <span className="eyebrow">
                  {story.factsLabel || "BUILT WITH"}
                </span>
                <p>{project.technologies.join(" · ")}</p>
              </div>
              {project.id === "ramco-profile" && (
                <RamcoTenure initialNow={initialNow} />
              )}
            </div>
          </header>
          {story.image && (
            <figure className="article-figure">
              <Image
                src={story.image}
                alt={story.imageAlt || project.title}
                width={1440}
                height={1000}
                sizes="(max-width: 760px) 90vw, 1000px"
                priority
              />
              <figcaption>
                {story.imageCaption || `${project.title} / Public website`}
              </figcaption>
            </figure>
          )}
          <div className="article-layout">
            <aside className="article-contents">
              <nav aria-label="In this article">
                <span className="eyebrow">IN THIS STORY</span>
                <ol>
                  {story.sections.map((section, i) => (
                    <li key={section.title}>
                      <a href={`#section-${i + 1}`}>{section.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
            <div className="article-prose">
              {story.sections.map((section, i) => (
                <section
                  key={section.title}
                  id={`section-${i + 1}`}
                  aria-labelledby={`heading-${i + 1}`}
                >
                  <span className="eyebrow article-section-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 id={`heading-${i + 1}`}>{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
              {(live || code) && (
                <div className="article-resources">
                  <span className="eyebrow">EXPLORE THE PROJECT</span>
                  <div>
                    {live && (
                      <a
                        className="text-link"
                        href={live}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {project.liveLinkLabel || "Visit project"} ↗
                      </a>
                    )}
                    {code && (
                      <a
                        className="text-link"
                        href={code}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View source code ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
        {next.id !== project.id && (
          <Link className="next-story" href={`/projects/${next.slug}`}>
            <span className="eyebrow">NEXT STORY</span>
            <span>
              {next.title}
              <span aria-hidden="true">↗</span>
            </span>
            <p>{next.story.headline}</p>
          </Link>
        )}
      </main>
      <Footer />
    </>
  );
}
