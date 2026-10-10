"use client";

// Type-only: erased at compile time, so no mongoose reaches the client bundle.
import type { Item } from "@/lib/collections/defineCollection";
import { CHAPTERS, sectionHeightVh } from "@/scene/camera/flightPath";
import { readService } from "./servicesLayout";

interface ServicesProps {
  services: Item[];
  /** Quality marker only; all tiers share the same visible intrinsic layout. */
  animated: boolean;
}

const chapter = CHAPTERS.find((c) => c.id === "approach")!;

/** Intrinsic editorial flow is identical before hydration and in every quality tier. */
export default function Services({ services, animated }: ServicesProps) {
  return (
    <section
      id="approach"
      className="chapter chapter--approach"
      style={services.length ? undefined : { height: `${sectionHeightVh(chapter)}vh` }}
      aria-label="Services"
      data-static={!animated ? "true" : undefined}
    >
      <div className="chapter__pin">
        <p className="chapter__label">
          {chapter.index} / {chapter.label}
        </p>
        <div className="services">
          {services.map((item, i) => {
            const { title, promise, outcomes, engagement } = readService(item);
            return (
              <article
                key={item.id}
                className="service-panel"
                aria-label={title || `Service ${i + 1}`}
              >
                <div className="service-panel__heading">
                  <p className="service-panel__index">{String(i + 1).padStart(2, "0")}</p>
                  {title !== "" && <h2 className="service-panel__title">{title}</h2>}
                </div>
                <div className="service-panel__detail">
                  <p className="service-panel__promise">{promise}</p>
                  {outcomes.length > 0 && (
                    <ul className="service-panel__outcomes">
                      {/* Chips can repeat, so the index is part of the key. */}
                      {outcomes.map((o, oi) => (
                        <li key={`${o}-${oi}`}>{o}</li>
                      ))}
                    </ul>
                  )}
                  {engagement !== "" && (
                    <p className="service-panel__engagement">
                      <span>Typical engagement</span>
                      {engagement}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
