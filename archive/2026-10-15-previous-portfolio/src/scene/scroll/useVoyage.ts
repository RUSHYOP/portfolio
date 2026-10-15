"use client";

import { useSyncExternalStore } from "react";
import { voyageStore, type VoyageState } from "./voyageStore";

const serverSnapshot: VoyageState = voyageStore.getState();

/** Subscribe a component to voyage state. Re-renders on every store change — use for DOM, not per-frame 3D. */
export function useVoyage(): VoyageState {
  return useSyncExternalStore(voyageStore.subscribe, voyageStore.getState, () => serverSnapshot);
}
