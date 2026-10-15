import { describe, expect, it } from "vitest";
import { formatRamcoTenure } from "./ramcoTenure";

describe("Ramco tenure", () => {
  it.each([
    ["2026-01-01T00:00:00Z", "Less than a month"],
    ["2026-03-01T12:00:00Z", "Less than a month"],
    ["2026-03-02T00:00:00Z", "1 month"],
    ["2026-10-15T00:00:00Z", "8 months"],
    ["2027-02-01T18:29:59Z", "11 months"],
    ["2027-02-01T18:30:00Z", "1 year"],
    ["2027-04-02T00:00:00Z", "1.2 years"],
    ["2028-02-02T00:00:00Z", "2 years"],
  ])("formats %s as %s", (date, expected) => {
    expect(formatRamcoTenure(new Date(date))).toBe(expected);
  });
});
