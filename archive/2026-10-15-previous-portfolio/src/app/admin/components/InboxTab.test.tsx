// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionItem } from "./types";

const { logClient } = vi.hoisted(() => ({ logClient: vi.fn() }));
vi.mock("@/lib/clientLog", () => ({ logClient, LOG_EVENTS: [] }));

const { default: InboxTab } = await import("./InboxTab");

afterEach(cleanup);

const inq = (over: Partial<CollectionItem> & { id: string }): CollectionItem =>
  ({
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    name: "Ada",
    email: "ada@example.com",
    building: "A compiler",
    budget: "lt5k",
    timeline: "asap",
    status: "new",
    notifyFailed: false,
    ...over,
  }) as CollectionItem;

const ok = (body: unknown = { success: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  logClient.mockClear();
  fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const rows = [
  inq({ id: "inq_1", name: "Ada", createdAt: "2026-01-01T00:00:00.000Z" }),
  inq({ id: "inq_2", name: "Grace", createdAt: "2026-02-01T00:00:00.000Z", status: "replied" }),
];

describe("InboxTab", () => {
  it("renders newest first with decoded budget, timeline and status labels", () => {
    render(<InboxTab inquiries={rows} toast={() => {}} loadData={async () => {}} />);
    const names = [...document.querySelectorAll(".admin-card-header strong")].map((n) => n.textContent);
    expect(names).toEqual(["Grace", "Ada"]);
    expect(screen.getAllByText("Under $5k").length).toBe(2);
    expect(screen.getAllByText("ASAP").length).toBe(2);
    // Scoped to the chips: the filter <select> carries the same option labels.
    const chips = [...document.querySelectorAll(".admin-card-header .admin-tag")].map((n) => n.textContent);
    expect(chips).toEqual(["Replied", "New"]);
  });

  it("filters by status and explains an empty filtered list", async () => {
    const user = userEvent.setup();
    render(<InboxTab inquiries={rows} toast={() => {}} loadData={async () => {}} />);
    await user.selectOptions(screen.getByLabelText("Filter by status"), "archived");
    expect(screen.getByText(/No inquiries with status archived/)).toBeDefined();
  });

  it("advances the status through new → replied and reloads", async () => {
    const user = userEvent.setup();
    const toast = vi.fn();
    const loadData = vi.fn().mockResolvedValue(undefined);
    render(<InboxTab inquiries={[rows[0]!]} toast={toast} loadData={loadData} />);

    await user.click(screen.getByRole("button", { name: "Mark replied" }));
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/inquiries/inq_1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ status: "replied" }) }),
    );
    expect(toast).toHaveBeenCalledWith("Marked replied");
  });

  it("logs and toasts when a status update fails, and does not reload", async () => {
    const user = userEvent.setup();
    const toast = vi.fn();
    const loadData = vi.fn().mockResolvedValue(undefined);
    fetchMock.mockResolvedValue(ok({ error: "Inquiry not found" }, 404));
    render(<InboxTab inquiries={[rows[0]!]} toast={toast} loadData={loadData} />);

    await user.click(screen.getByRole("button", { name: "Mark replied" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Inquiry not found", true));
    expect(loadData).not.toHaveBeenCalled();
    expect(logClient).toHaveBeenCalledWith("admin.save_failed", expect.objectContaining({ collection: "inquiries", verb: "status" }));
  });

  it("survives a network error without an unhandled rejection", async () => {
    const user = userEvent.setup();
    const toast = vi.fn();
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<InboxTab inquiries={[rows[0]!]} toast={toast} loadData={async () => {}} />);

    await user.click(screen.getByRole("button", { name: "Mark replied" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Network error — the change was not saved.", true));
    expect(logClient).toHaveBeenCalled();
  });

  it("requires a confirmation click before deleting", async () => {
    const user = userEvent.setup();
    const loadData = vi.fn().mockResolvedValue(undefined);
    render(<InboxTab inquiries={[rows[0]!]} toast={() => {}} loadData={loadData} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm?" }));
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/inquiries/inq_1", expect.objectContaining({ method: "DELETE" }));
  });

  it("flags an inquiry whose owner notification failed", () => {
    render(<InboxTab inquiries={[inq({ id: "inq_3", notifyFailed: true })]} toast={() => {}} loadData={async () => {}} />);
    expect(screen.getByText("notify failed")).toBeDefined();
  });

  it("shows an empty state when there are no inquiries at all", () => {
    render(<InboxTab inquiries={[]} toast={() => {}} loadData={async () => {}} />);
    expect(screen.getByText("No inquiries yet.")).toBeDefined();
  });
});
