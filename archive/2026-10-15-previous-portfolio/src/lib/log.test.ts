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

  // F1: on Vercel the logs/ write always fails (EROFS); stdout is the only sink that
  // reaches the function logs, so the payload must be mirrored there instead of dropped.
  it("mirrors the record to stdout when the file write fails", async () => {
    fsMock.appendFile.mockRejectedValue(Object.assign(new Error("read-only file system"), { code: "EROFS" }));
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await appendLog("inquiries", { event: "notify.failed", id: "inq_1" });
      expect(spy).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
      expect(payload.name).toBe("inquiries");
      expect(payload.event).toBe("notify.failed");
      expect(payload.id).toBe("inq_1");
      expect(Number.isNaN(Date.parse(payload.ts))).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("does not mirror to stdout when the file write succeeds", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await appendLog("api", { event: "ok" });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("records the sanitised log name in the written line", async () => {
    await appendLog("we/ird", { event: "x" });
    const written = JSON.parse(String(fsMock.appendFile.mock.calls[0][1]).trim());
    expect(written.name).toBe("we_ird");
  });
});
