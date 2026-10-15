import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import ContactForm from "@/components/ContactForm";
import RamcoTenure from "@/components/RamcoTenure";
import {
  externalUrl,
  identity,
  portfolioProjects,
  portfolioTimestamp,
} from "@/lib/portfolio";

export const revalidate = 300;
export const metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const projects = await portfolioProjects();
  const initialNow = await portfolioTimestamp();
  const featuredProjects = projects.filter((p) =>
    ["gharpay", "digital-garden"].includes(p.id),
  );
  const research = projects.find((p) => p.id === "proj_2");
  const ramco = projects.find((p) => p.id === "ramco-profile");
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero shell" id="top" aria-labelledby="hero-title">
          <div className="hero-top">
            <span className="eyebrow">
              <span className="status-dot" /> AI ENGINEER
            </span>
            <span className="eyebrow hero-location">BANGALORE, INDIA ↗</span>
          </div>
          <h1 id="hero-title">
            <span>Thoughtful code.</span>
            <span className="hero-second">
              Useful <em>software.</em>
            </span>
          </h1>
          <div className="hero-bottom">
            <div className="hero-intro">
              <p>
                I’m Purav, an AI Engineer. I turn ideas into products, working
                across the stack — from interfaces and microservices to AI
                agents and the networks that connect them.
              </p>
              <a href="#work" className="text-link">
                Explore some of my work <span aria-hidden="true">↓</span>
              </a>
            </div>
            <a
              href="#about"
              className="hero-profile"
              aria-label="A little more about Purav"
            >
              <div className="portrait-small">
                <Image
                  src="/images/purav.jpg"
                  alt="Purav S"
                  fill
                  priority
                  sizes="160px"
                />
              </div>
              <div>
                <span>A builder at heart.</span>
                <small>Curious by default.</small>
              </div>
              <span className="profile-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
          <div className="hero-foot eyebrow">
            <span className="hero-expertise">
              {[
                "FULL STACK DEVELOPMENT",
                "MICROSERVICES",
                "PRODUCT DEVELOPMENT",
                "AGENTIC OPERATIONS",
                "NETWORKING",
              ].map((area) => (
                <span key={area}>{area}</span>
              ))}
            </span>
            <span className="scroll-note">
              SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
            </span>
          </div>
        </section>

        <section
          className="work-section shell section-space"
          id="work"
          aria-labelledby="work-title"
        >
          <div className="section-heading" data-reveal>
            <span className="eyebrow section-number">01 / SOME OF MY WORK</span>
            <div>
              <h2 id="work-title">
                Built to do
                <br />
                <em>something useful.</em>
              </h2>
            </div>
            <Link href="/projects" className="text-link">
              All work <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {ramco && (
            <article className="ramco-feature" data-reveal>
              <div className="ramco-feature-copy">
                <span className="eyebrow">01 / WORK PROFILE</span>
                <h3>
                  <Link href={`/projects/${ramco.slug}`}>
                    My work at
                    <br />
                    <em>Ramco Systems.</em>
                  </Link>
                </h3>
                <p>{ramco.description}</p>
                <Link href={`/projects/${ramco.slug}`} className="text-link">
                  Read my work profile ↗
                </Link>
              </div>
              <RamcoTenure initialNow={initialNow} />
            </article>
          )}
          {featuredProjects.map((project, index) => (
            <article
              className="web-project-feature"
              key={project.id}
              data-reveal
            >
              <Link
                href={`/projects/${project.slug}`}
                className="web-project-preview"
                aria-label={`Read the ${project.title} project story`}
              >
                <Image
                  src={project.story.image!}
                  alt={project.story.imageAlt || project.title}
                  width={1440}
                  height={1000}
                  sizes="(max-width: 760px) 90vw, 60vw"
                />
                <span className="art-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <div className="web-project-copy">
                <span className="eyebrow">
                  {String(index + 2).padStart(2, "0")} /{" "}
                  {project.story.category.toUpperCase()}
                </span>
                <h3>
                  <Link href={`/projects/${project.slug}`}>
                    {project.title}
                  </Link>
                </h3>
                <p className="web-project-deck">
                  {project.id === "gharpay" ? (
                    <>
                      A clearer picture of
                      <br />
                      <em>society finances.</em>
                    </>
                  ) : (
                    <>
                      A place for ideas
                      <br />
                      <em>to connect.</em>
                    </>
                  )}
                </p>
                <p>{project.description}</p>
                <div className="project-tags">
                  {project.technologies.slice(0, 3).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <Link href={`/projects/${project.slug}`} className="text-link">
                  Read the project story ↗
                </Link>
              </div>
            </article>
          ))}
          {research && (
            <article className="research-feature" data-reveal>
              <div className="research-art" aria-hidden="true">
                <div className="research-grid" />
                <span className="research-kicker eyebrow">
                  PATTERNS. SIGNALS. ANOMALIES.
                </span>
                <span className="research-word">
                  Proc<span>SAGE</span>
                  <sup>↗</sup>
                </span>
                <div className="signal-bars">
                  {[
                    12, 24, 38, 25, 48, 32, 58, 46, 84, 38, 52, 30, 65, 40, 28,
                    58, 90, 50, 34, 20, 42, 66, 38, 28, 16, 32, 48, 22,
                  ].map((h, i) => (
                    <i key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <span className="research-bottom eyebrow">
                  HOST-BASED THREAT DETECTION / PYTHON + ML
                </span>
              </div>
              <div className="research-copy">
                <span className="eyebrow">
                  04 / MACHINE LEARNING & RESEARCH
                </span>
                <h3>
                  A closer look at
                  <br />
                  what doesn’t belong.
                </h3>
                <p>{research.description}</p>
                <div className="research-links">
                  {research.showLiveLink && externalUrl(research.liveLink) && (
                    <a
                      href={research.liveLink}
                      className="text-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read the paper ↗
                    </a>
                  )}
                  <Link
                    href={`/projects/${research.slug}`}
                    className="subtle-link"
                  >
                    Read the project story ↗
                  </Link>
                </div>
              </div>
            </article>
          )}
        </section>

        <section
          className="capabilities section-space"
          aria-labelledby="capabilities-title"
        >
          <div className="shell capability-layout">
            <div data-reveal>
              <span className="eyebrow section-number">HOW I CAN HELP</span>
              <h2 id="capabilities-title">
                The idea is just
                <br />
                <em>the beginning.</em>
              </h2>
              <p className="muted capability-intro">
                Good software starts with clear decisions. I help shape ideas,
                review technical approaches, and turn a direction into something
                that works.
              </p>
              <a href="#contact" className="text-link">
                Let’s work it through ↗
              </a>
            </div>
            <div className="capability-list">
              <article data-reveal>
                <span className="eyebrow">01</span>
                <div>
                  <h3>Full stack & product development</h3>
                  <p>
                    From an early idea to a working product: responsive
                    interfaces, application logic, APIs, and data.
                  </p>
                  <small>React · Next.js · TypeScript</small>
                </div>
                <span aria-hidden="true">↗</span>
              </article>
              <article data-reveal>
                <span className="eyebrow">02</span>
                <div>
                  <h3>Microservices & networking</h3>
                  <p>
                    Building services, connecting systems, and working through
                    the infrastructure and networking behind an application.
                  </p>
                  <small>Python · Flask · Node.js · MongoDB</small>
                </div>
                <span aria-hidden="true">↗</span>
              </article>
              <article data-reveal>
                <span className="eyebrow">03</span>
                <div>
                  <h3>AI & agentic operations</h3>
                  <p>
                    AI agents, automated workflows, and machine learning
                    applications that connect models with tools and systems.
                  </p>
                  <small>AI agents · Automation · Python · ML</small>
                </div>
                <span aria-hidden="true">↗</span>
              </article>
            </div>
          </div>
        </section>

        <section
          className="about-section shell section-space"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="about-portrait" data-reveal>
            <Image
              src="/images/purav.jpg"
              alt="Purav outdoors in Bangalore"
              width={1368}
              height={1824}
              sizes="(max-width: 760px) 90vw, 35vw"
            />
            <div className="portrait-caption">
              <span>PURAV S</span>
              <span>BANGALORE, IN</span>
            </div>
          </div>
          <div className="about-copy" data-reveal>
            <span className="eyebrow section-number">
              02 / THE PERSON BEHIND THE CODE
            </span>
            <h2 id="about-title">
              Always curious.
              <br />
              <em>Always building.</em>
            </h2>
            <p className="about-lead">
              I’m Purav, an AI Engineer based in Bangalore and currently a
              Software Engineer 1 at Ramco Systems.
            </p>
            <p>
              I joined Ramco as an intern in February 2026 and moved into a
              full-time role in June 2026. My work focuses on AI-driven product
              engineering, developer tooling, and automation — connecting
              product requirements with working software.
            </p>
            <p>
              I work across full stack development, microservices, agentic
              operations, and networking, with an emphasis on reliable systems,
              thoughtful architecture, and practical outcomes.
            </p>
            <a
              href={identity.github}
              className="text-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              See what I’m building ↗
            </a>
            <div className="about-signature" aria-hidden="true">
              Purav.
            </div>
          </div>
        </section>

        <section
          className="contact-section section-space"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="shell">
            <div className="contact-heading" data-reveal>
              <span className="eyebrow">03 / SAY HELLO</span>
              <h2 id="contact-title">
                Good things start
                <br />
                with a <em>conversation.</em>
              </h2>
            </div>
            <div className="contact-layout">
              <div className="contact-intro">
                <p>
                  Have an idea taking shape, a technical decision to work
                  through, or a project that could use a fresh perspective?
                </p>
                <a href={`mailto:${identity.email}`} className="email-link">
                  {identity.email} <span aria-hidden="true">↗</span>
                </a>
                <div className="contact-social">
                  <a
                    href={identity.github}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub ↗
                  </a>
                  <a
                    href={identity.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    LinkedIn ↗
                  </a>
                </div>
                <span className="eyebrow contact-location">
                  BASED IN BANGALORE, INDIA
                </span>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <Motion />
    </>
  );
}
