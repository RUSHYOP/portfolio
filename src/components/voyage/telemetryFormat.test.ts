import { describe, it, expect } from "vitest";
import { formatTelemetry } from "./telemetryFormat";
import { CHAPTERS, type ChapterId } from "@/scene/camera/flightPath";

// ChapterId (not string) so a typo'd id is a compile error, not a runtime non-null assertion.
const ch = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

describe("formatTelemetry", () => {
  it("formats T+ as mm:ss", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 00:00");
    expect(formatTelemetry({ elapsedMs: 65_000, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 01:05");
    // 59:30 is well inside the pre-cap range, so a cap that fired early would show 59:59 here.
    expect(formatTelemetry({ elapsedMs: 3_570_000, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 59:30");
    // 3_599_999ms is the last tick before the 3600s cap: real mm:ss, not the saturated branch.
    expect(formatTelemetry({ elapsedMs: 3_599_999, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 59:59");
    expect(formatTelemetry({ elapsedMs: 3_600_000, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).time).toBe("T+ 59:59");
  });
  it("formats velocity in c with two decimals", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).vel).toBe("VEL 0.00c");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 1, distanceAU: 9.4, chapter: ch("launch") }).vel).toBe("VEL 0.98c");
  });
  it("formats distance, SIGNAL LOST in the passage, ARRIVED from pilot on", () => {
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 9.4, chapter: ch("launch") }).dist).toBe("DIST 9.4 AU");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 2.25, chapter: ch("belt") }).dist).toBe("DIST 2.3 AU");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 1, chapter: ch("passage") }).dist).toBe("SIGNAL LOST");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 0, chapter: ch("pilot") }).dist).toBe("0.0 AU · ARRIVED");
    // landing sits between pilot and surface — pin it so the middle of the ARRIVED range can't be dropped.
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 0, chapter: ch("landing") }).dist).toBe("0.0 AU · ARRIVED");
    expect(formatTelemetry({ elapsedMs: 0, velocity: 0, distanceAU: 0, chapter: ch("surface") }).dist).toBe("0.0 AU · ARRIVED");
  });
});
