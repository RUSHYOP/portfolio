import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import ContactForm from "@/components/ContactForm";
import { externalUrl, identity, portfolioProjects } from "@/lib/portfolio";

export const revalidate = 300;
export const metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const projects = await portfolioProjects();
  const gharpay = projects.find((p) => p.id === "gharpay");
  const research = projects.find((p) => p.id === "proj_2");
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="hero shell" id="top" aria-labelledby="hero-title">
          <div className="hero-top">
            <span className="eyebrow">
              <span className="status-dot" /> SOFTWARE DEVELOPER
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
                I’m Purav. I bring ideas to life through web applications,
                backend systems, and a healthy curiosity for what’s next.
              </p>
              <a href="#work" className="text-link">
                Explore selected work <span aria-hidden="true">↓</span>
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
            <span>WEB DEVELOPMENT / BACKEND / MACHINE LEARNING</span>
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
            <span className="eyebrow section-number">01 / SELECTED WORK</span>
            <div>
              <h2 id="work-title">
                Built to do
                <br />
                <em>something useful.</em>
              </h2>
              <p>
                A selection of ideas taken from a question
                <br className="desktop-break" /> to something you can actually
                use.
              </p>
            </div>
            <Link href="/projects" className="text-link">
              All projects <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {gharpay && (
            <article className="gharpay-feature" data-reveal>
              <Link
                href={`/projects/${gharpay.slug}`}
                className="gharpay-preview"
                aria-label="Read the GharPay project story"
              >
                <Image
                  src="/work/gharpay.webp"
                  alt="GharPay’s apartment society accounting website"
                  width={1440}
                  height={1000}
                  sizes="(max-width: 760px) 90vw, 60vw"
                />
                <span className="art-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <div className="gharpay-copy">
                <span className="eyebrow">
                  01 / WEB APPLICATION · COLLABORATION
                </span>
                <h3>
                  <Link href={`/projects/${gharpay.slug}`}>GharPay</Link>
                </h3>
                <p className="gharpay-deck">
                  A clearer picture of
                  <br />
                  <em>society finances.</em>
                </p>
                <p>{gharpay.description}</p>
                <div className="project-tags">
                  {gharpay.technologies.slice(0, 3).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <Link href={`/projects/${gharpay.slug}`} className="text-link">
                  Read the project story ↗
                </Link>
              </div>
            </article>
          )}
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
                  02 / MACHINE LEARNING & RESEARCH
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
                I like working across the layers of a product — connecting the
                experience people see with the systems that make it work.
              </p>
              <a href="#contact" className="text-link">
                Let’s build something ↗
              </a>
            </div>
            <div className="capability-list">
              <article data-reveal>
                <span className="eyebrow">01</span>
                <div>
                  <h3>Web applications</h3>
                  <p>
                    Responsive interfaces, thoughtful interactions, and
                    full-stack applications built around a clear purpose.
                  </p>
                  <small>React · Next.js · TypeScript</small>
                </div>
                <span aria-hidden="true">↗</span>
              </article>
              <article data-reveal>
                <span className="eyebrow">02</span>
                <div>
                  <h3>Backend & systems</h3>
                  <p>
                    APIs, data models, and the behind-the-scenes logic that
                    turns an interface into a working product.
                  </p>
                  <small>Python · Flask · Node.js · MongoDB</small>
                </div>
                <span aria-hidden="true">↗</span>
              </article>
              <article data-reveal>
                <span className="eyebrow">03</span>
                <div>
                  <h3>Machine learning</h3>
                  <p>
                    Exploring useful applications of data, from anomaly
                    detection to language and health-focused prototypes.
                  </p>
                  <small>Python · ML · NLP</small>
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
              I’m Purav, a software developer based in Bangalore. I enjoy
              figuring out how things work — then finding a way to make them
              work better.
            </p>
            <p>
              My projects move between web development, backend engineering, and
              machine learning. The common thread is a practical problem, a
              willingness to learn, and the satisfaction of turning an idea into
              something real.
            </p>
            <p>
              From collaborative society accounting software to research in
              threat detection, I care about the details that make software
              useful.
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
                  Have an idea to explore, a project in mind, or just something
                  interesting to share?
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
