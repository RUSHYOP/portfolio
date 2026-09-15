import { describe, it, expect } from "vitest";
import { clientIp } from "./clientIp";

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

describe("clientIp", () => {
  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(clientIp(req({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.2.3.4, 9.9.9.9" }))).toBe("5.5.5.5");
  });

  it("falls back to the first hop of x-forwarded-for, trimmed", () => {
    expect(clientIp(req({ "x-forwarded-for": "  1.2.3.4 , 9.9.9.9" }))).toBe("1.2.3.4");
  });

  it("returns 'unknown' when neither header is present", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("returns 'unknown' for blank/whitespace-only header values", () => {
    expect(clientIp(req({ "x-real-ip": "   ", "x-forwarded-for": " , 9.9.9.9" }))).toBe("unknown");
  });
});
