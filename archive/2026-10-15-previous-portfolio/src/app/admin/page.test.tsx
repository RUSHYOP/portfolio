// @vitest-environment jsdom
// First test for the admin shell itself. The nine tab components are mocked away —
// they have their own suites — so the assertions stay on the load-failure toast, the
// re-auth path and the Save-All guard (C1: a failed settings load must not arm a
// 13-field overwrite with defaults).
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { logClient } = vi.hoisted(() => ({ logClient: vi.fn() }));
vi.mock("@/lib/clientLog", () => ({ logClient, LOG_EVENTS: [] }));

// framer-motion's layout/layoutId animations need a real layout engine; render plain DOM.
vi.mock("framer-motion", () => {
  const strip = (props: Record<string, unknown>) => {
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (["initial", "animate", "exit", "transition", "whileHover", "whileTap", "layout", "layoutId"].includes(k)) continue;
      rest[k] = v;
    }
    return rest;
  };
  // Cached per tag: a fresh component identity on every property access would make React
  // remount the whole tree on each render, detaching the nodes the tests just queried.
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const make = (tag: string) => {
    const hit = cache.get(tag);
    if (hit) return hit;
    const C = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
      React.createElement(tag, strip(props), children);
    C.displayName = `motion.${tag}`;
    cache.set(tag, C);
    return C;
  };
  return {
    motion: new Proxy({} as Record<string, unknown>, { get: (_t, tag: string) => make(tag) }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// ContentTab is the only tab the tests drive: its Save button exercises saveSettings.
vi.mock("./components/ContentTab", () => ({
  default: ({ onSave }: { onSave: (u: Record<string, unknown>) => Promise<void> }) => (
    <button onClick={() => onSave({ manifesto: "m" })}>Save All</button>
  ),
}));
for (const mod of ["ProjectsTab", "SkillsTab", "NavigationTab", "MediaTab", "CollectionTab", "ConsultingTab", "InboxTab"]) {
  vi.doMock(`./components/${mod}`, () => ({ default: () => null }));
}

const { default: AdminPage } = await import("./page");

afterEach(cleanup);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Routes every fetch the page makes; `settings` overrides the GET /api/settings response. */
function mountWith(settingsResponse: () => Response) {
  const calls: { url: string; method: string }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET" });
    if (url.startsWith("/api/auth/verify")) return json({ ok: true });
    if (url.startsWith("/api/settings")) {
      if ((init?.method ?? "GET") === "PUT") return json({ ok: true });
      return settingsResponse();
    }
    return json([]);
  });
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<AdminPage />);
  return { calls, fetchMock, user };
}

beforeEach(() => logClient.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("AdminPage load failures", () => {
  it("shows one aggregated toast and blocks Save All when the settings load fails", async () => {
    const { calls, user } = mountWith(() => json({ error: "boom" }, 500));

    expect(await screen.findByText(/Could not load: settings/)).toBeTruthy();
    expect(logClient).toHaveBeenCalledWith("admin.load_failed", expect.objectContaining({ collection: "settings", status: 500 }));

    await user.click(await screen.findByText("Save All"));
    expect(await screen.findByText(/Settings never loaded/)).toBeTruthy();
    expect(calls.some((c) => c.url.startsWith("/api/settings") && c.method === "PUT")).toBe(false);
  });

  it("reports two failed loads in a single toast", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith("/api/auth/verify")) return json({ ok: true });
        if (url.startsWith("/api/settings") || url.startsWith("/api/projects")) return json({ error: "boom" }, 500);
        return json([]);
      })
    );
    render(<AdminPage />);

    const toast = await screen.findByText(/Could not load:/);
    expect(toast.textContent).toMatch(/Could not load: (settings, projects|projects, settings)\./);
    expect(screen.getAllByText(/Could not load:/)).toHaveLength(1);
  });

  it("falls back to the login form when a load 401s, with no error toast", async () => {
    mountWith(() => json({ error: "Unauthorized" }, 401));

    expect(await screen.findByText("Admin Login")).toBeTruthy();
    expect(screen.queryByText(/Could not load/)).toBeNull();
  });

  it("sends the PUT when every load succeeded", async () => {
    const { calls, user } = mountWith(() => json({ manifesto: "live" }));

    await user.click(await screen.findByText("Save All"));
    await waitFor(() => expect(calls.some((c) => c.url.startsWith("/api/settings") && c.method === "PUT")).toBe(true));
    expect(screen.queryByText(/Could not load/)).toBeNull();
  });
});
