import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted so the vi.mock factory (hoisted above imports) can close over them.
const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  appendFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs", () => ({
  promises: { mkdir: fsMock.mkdir, appendFile: fsMock.appendFile },
}));

import { appendLog } from "./log";

beforeEach(() => {
  fsMock.mkdir.mockClear().mockResolvedValue(undefined);
  fsMock.appendFile.mockClear().mockResolvedValue(undefined);
});

describe("appendLog", () => {
  it("lets the server timestamp win over a client-supplied ts", async () => {
    await appendLog("client", { event: "x", ts: "1999-01-01T00:00:00.000Z" });
    expect(fsMock.appendFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(String(fsMock.appendFile.mock.calls[0][1]).trim());
    expect(written.event).toBe("x");
    expect(written.ts).not.toBe("1999-01-01T00:00:00.000Z");
    expect(Number.isNaN(Date.parse(written.ts))).toBe(false);
  });

  it("resolves when the filesystem is read-only", async () => {
    const eros = Object.assign(new Error("read-only file system"), { code: "EROFS" });
    fsMock.appendFile.mockRejectedValue(eros);
    await expect(appendLog("client", { event: "x" })).resolves.toBeUndefined();
  });
});
