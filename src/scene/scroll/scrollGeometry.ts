import type { Chapter } from "@/scene/camera/flightPath";
export interface ScrollSegment { startPx: number; endPx: number; start: number; end: number }
function map(value: number, segments: readonly ScrollSegment[], inverse: boolean): number {
  if (!segments.length) return 0;
  const input = Number.isNaN(value) ? 0 : value;
  const from = (s: ScrollSegment) => inverse ? s.start : s.startPx;
  const to = (s: ScrollSegment) => inverse ? s.end : s.endPx;
  const outputFrom = (s: ScrollSegment) => inverse ? s.startPx : s.start;
  const outputTo = (s: ScrollSegment) => inverse ? s.endPx : s.end;
  const first = segments[0], last = segments[segments.length - 1];
  if (input <= from(first)) return outputFrom(first);
  if (input >= to(last)) return outputTo(last);
  const s = segments.find(s => input < to(s)) ?? last;
  const span = to(s) - from(s);
  const t = span > 0 ? Math.max(0, Math.min(1, (input - from(s)) / span)) : 1;
  return outputFrom(s) + t * (outputTo(s) - outputFrom(s));
}
export const toVoyage = (y: number, segments: readonly ScrollSegment[]) => map(y, segments, false);
export const toScroll = (p: number, segments: readonly ScrollSegment[]) => map(p, segments, true);
export function measureScrollSegments(track: HTMLElement | null, chapters: readonly Chapter[], scrollY: number, viewportHeight: number): ScrollSegment[] {
  return chapters.flatMap(c => {
    const element = track?.querySelector<HTMLElement>(`#${c.id}`);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    const startPx = rect.top + scrollY;
    return [{ startPx, endPx: startPx + rect.height - (c.id === "surface" ? viewportHeight : 0), start: c.start, end: c.end }];
  });
}
