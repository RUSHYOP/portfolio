"use client";

import { useVoyage } from "@/scene/scroll/useVoyage";
import { formatTelemetry } from "./telemetry";

/** Mono HUD, top-left. Hidden under 768px via CSS. */
export default function Telemetry() {
  const s = useVoyage();
  const r = formatTelemetry(s);
  return (
    <div className="telemetry" aria-hidden="true">
      <span>{r.time}</span>
      <span>{r.vel}</span>
      <span className={s.chapter.id === "passage" ? "telemetry__lost" : undefined}>{r.dist}</span>
    </div>
  );
}
