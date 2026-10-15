"use client";

import { useSyncExternalStore } from "react";
import {
  formatRamcoTenure,
  RAMCO_STARTED_LABEL,
  RAMCO_STARTED_ON,
} from "@/lib/ramcoTenure";

function currentMinute() {
  return Math.floor(Date.now() / 60_000);
}
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  // Refresh promptly when returning to a backgrounded tab.
  const refresh = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", refresh);
  };
}

export default function RamcoTenure({ initialNow }: { initialNow: number }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, () =>
    Math.floor(initialNow / 60_000),
  );
  return (
    <div className="ramco-tenure">
      <span className="eyebrow">TIME AT RAMCO</span>
      <span className="ramco-tenure-value">
        {formatRamcoTenure(new Date(minute * 60_000))}
      </span>
      <time dateTime={RAMCO_STARTED_ON}>Since {RAMCO_STARTED_LABEL}</time>
    </div>
  );
}
