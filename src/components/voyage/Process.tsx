"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { Item } from "@/lib/collections/defineCollection";
import { useVoyage } from "@/scene/scroll/useVoyage";
import { orbitHeightVh, orbitPhase } from "./orbitPhase";

const text = (value: unknown) => typeof value === "string" ? value : "";

function Step({ step, index }: { step: Item; index: number }) {
  const title = text(step.title), what = text(step.what);
  const deliverable = text(step.deliverable), duration = text(step.duration);
  return <article className="glass process__panel">
    <p className="chapter__label">STEP {String(index + 1).padStart(2, "0")}</p>
    {title && <h3>{title}</h3>}
    <dl>
      {what && <><dt>What happens</dt><dd>{what}</dd></>}
      {deliverable && <><dt>What you get</dt><dd>{deliverable}</dd></>}
      {duration && <><dt>How long</dt><dd>{duration}</dd></>}
    </dl>
  </article>;
}

export default function Process({ steps, animated }: { steps: Item[]; animated: boolean }) {
  const voyage = useVoyage();
  const readerRef = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);
  const local = voyage.chapter.id === "orbit" ? voyage.chapterProgress : voyage.progress < .22 ? 0 : 1;
  const phase = orbitPhase(local, steps.length);

  useLayoutEffect(() => {
    if (readerRef.current) readerRef.current.scrollTop = 0;
  }, [phase.index]);

  if (!steps.length) return <section id="orbit" className="chapter" style={{ height: "150vh" }} />;

  return <section id="orbit" aria-labelledby="process-heading"
    className={`chapter process ${animated ? "process--animated" : "process--still"}`}
    style={animated ? { height: `${orbitHeightVh(steps.length)}vh` } : undefined}>
    {animated ? <div className="chapter__pin process__pin">
      <div className="process__content">
        <p className="chapter__label">04 / ORBIT</p>
        <h2 id="process-heading">How we get there</h2>
        <p className="process__count">{String(phase.index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</p>
        <button type="button" className="process__all-toggle" aria-expanded={allOpen}
          aria-controls="process-all-steps" onClick={() => setAllOpen(open => !open)}>
          {allOpen ? "Return to current step" : "Read all steps"}
        </button>
        <div ref={readerRef} className="process__reader" role="region" aria-label="Process step details"
          hidden={allOpen} inert={allOpen} tabIndex={allOpen ? -1 : 0}>
          <div style={{ opacity: phase.fade, transform: `translateY(${12 * (1 - phase.fade)}px)` }}>
            <Step step={steps[phase.index]} index={phase.index} />
          </div>
        </div>
        <div id="process-all-steps" className="process__all" role="region" aria-label="All process steps"
          hidden={!allOpen} inert={!allOpen} tabIndex={allOpen ? 0 : -1}>
          <ol>{steps.map((step, index) => <li key={step.id}><Step step={step} index={index} /></li>)}</ol>
        </div>
      </div>
    </div> : <div className="process__static">
      <p className="chapter__label">04 / ORBIT</p>
      <h2 id="process-heading">How we get there</h2>
      <ol>{steps.map((step, index) => <li key={step.id}><Step step={step} index={index} /></li>)}</ol>
    </div>}
  </section>;
}
