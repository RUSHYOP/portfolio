// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import RamcoTenure from "./RamcoTenure";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("live Ramco tenure", () => {
  it("updates across the first anniversary and stops its clock when removed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-02-01T18:29:00Z"));
    const { unmount } = render(<RamcoTenure initialNow={Date.now()} />);
    expect(screen.getByText("11 months")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("1 year")).toBeTruthy();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
