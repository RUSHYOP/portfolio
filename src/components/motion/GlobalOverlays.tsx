"use client";

import { usePathname } from "next/navigation";
import ScrollProgress from "./ScrollProgress";
import FilmGrain from "./FilmGrain";
import Vignette from "./Vignette";
import CustomCursor from "./CustomCursor";

/**
 * Mounts the cinematic overlays on public routes only.
 * Admin routes get a clean utilitarian surface.
 * /voyage keeps the overlays but not ScrollProgress — the flight rail is its progress UI,
 * and the legacy top hairline reads as a stray artefact over the scene.
 */
export default function GlobalOverlays() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  const isVoyage = pathname?.startsWith("/voyage") ?? false;
  return (
    <>
      <Vignette />
      <FilmGrain />
      {!isVoyage && <ScrollProgress />}
      <CustomCursor />
    </>
  );
}
