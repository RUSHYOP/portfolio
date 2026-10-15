"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Live `window.matchMedia(query).matches`. False on the server and wherever matchMedia does
 *  not exist (jsdom), so callers must treat false as the default/desktop case. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // No matchMedia (jsdom, very old browsers): nothing to subscribe to.
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
