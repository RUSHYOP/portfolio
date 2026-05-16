"use client";

import { usePathname } from "next/navigation";
import ScrollProgress from "./ScrollProgress";
import FilmGrain from "./FilmGrain";
import Vignette from "./Vignette";
import CustomCursor from "./CustomCursor";

/**
 * Mounts the cinematic overlays on public routes only.
 * Admin routes get a clean utilitarian surface.
 */
export default function GlobalOverlays() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <>
      <Vignette />
      <FilmGrain />
      <ScrollProgress />
      <CustomCursor />
    </>
  );
}
