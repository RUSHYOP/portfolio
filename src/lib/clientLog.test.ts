import { describe, it, expect, vi, afterEach } from "vitest";
import { logClient } from "./clientLog";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("logClient", () => {
  it("never throws on unserializable data", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logClient("quality.tier", circular)).not.toThrow();
    expect(() => logClient("quality.tier", { big: BigInt(1) })).not.toThrow();
  });
  it("emits one JSON line and posts it with keepalive", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    logClient("quality.probe", { fps: 60 });
    expect(info).toHaveBeenCalledTimes(1);
    const line = info.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toEqual({ event: "quality.probe", fps: 60 });
    expect(fetchMock).toHaveBeenCalledWith("/api/logs", expect.objectContaining({ method: "POST", keepalive: true, body: line }));
  });
});
