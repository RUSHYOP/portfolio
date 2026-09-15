// @vitest-environment jsdom
// Only this file and FieldInput.test need a DOM; the rest of the suite stays on `node`.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionItem, UploadType } from "./types";

// next/image needs the Next runtime; a plain <img> is enough here.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double, never rendered in the app
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

// vi.hoisted so the spy exists before the hoisted vi.mock factory runs.
const { logClient } = vi.hoisted(() => ({ logClient: vi.fn() }));
vi.mock("@/lib/clientLog", () => ({ logClient, LOG_EVENTS: [] }));

const { default: CollectionTab } = await import("./CollectionTab");
// Imported from ./defs, not ./index — ./index pulls in mongoose.
const { caseStudiesDef, testimonialsDef, servicesDef } = await import("@/lib/collections/defs");

// vitest.config.mts has no `globals: true`, so RTL's auto-cleanup hook never registers.
afterEach(cleanup);

/* ------------------------------------------------------------------ */

const item = (over: Partial<CollectionItem> & { id: string }): CollectionItem =>
  ({
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    slug: "alpha",
    title: "Alpha",
    client: "",
    context: "",
    problem: "",
    architecture: "",
    outcome: "",
    stack: [],
    metrics: [],
    diagram: "",
    planetFeature: "none",
    published: false,
    ...over,
  }) as CollectionItem;

const ok = (body: unknown = { success: true }, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fail = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  logClient.mockClear();
  fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

type Def = typeof caseStudiesDef;

function setup(
  items: CollectionItem[],
  def: Def = caseStudiesDef,
  // `singular` is overridable so the fallback (derived from `title`) can be exercised too.
  extra: { loading?: boolean; title?: string; singular?: string } = {},
) {
  const toast = vi.fn();
  const loadData = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const uploadFile = vi.fn<(f: File, t: UploadType) => Promise<string | null>>().mockResolvedValue(null);
  const user = userEvent.setup();
  const utils = render(
    <CollectionTab
      def={def}
      apiBase="/api/case-studies"
      title="Case studies"
      singular="case study"
      items={items}
      toast={toast}
      loadData={loadData}
      uploadFile={uploadFile}
      uploading={false}
      {...extra}
    />,
  );
  return { toast, loadData, uploadFile, user, ...utils };
}

/** The most recent fetch call as [url, init]. */
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit];
const lastBody = () => JSON.parse(String(lastCall()[1].body)) as Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * List rendering
 * ------------------------------------------------------------------ */

describe("CollectionTab list", () => {
  it("shows an empty state and no editor until Add is clicked", () => {
    const { container } = setup([]);
    expect(screen.getByText(/no case studies yet/i)).toBeDefined();
    expect(container.querySelector("#field-title")).toBeNull();
  });

  it("shows a loading hint instead of the empty state while loading", () => {
    setup([], caseStudiesDef, { loading: true });
    expect(screen.queryByText(/no case studies yet/i)).toBeNull();
    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  it("renders one row per item with a Live/Draft badge for a publishable def", () => {
    setup([item({ id: "a", title: "Alpha", published: true }), item({ id: "b", title: "Beta", order: 1 })]);
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Live")).toBeDefined();
    expect(screen.getByText("Draft")).toBeDefined();
  });

  it("omits publish controls for a non-publishable def", () => {
    setup([{ id: "s1", order: 0, createdAt: "2026-01-01T00:00:00.000Z", title: "Svc", promise: "p", outcomes: [], engagement: "" } as CollectionItem], servicesDef);
    expect(screen.queryByText("Live")).toBeNull();
    expect(screen.queryByText("Draft")).toBeNull();
    expect(screen.queryByRole("button", { name: /publish/i })).toBeNull();
  });

  it("sorts orderable items by order", () => {
    const { container } = setup([item({ id: "b", title: "Beta", order: 1 }), item({ id: "a", title: "Alpha", order: 0 })]);
    const names = [...container.querySelectorAll(".admin-collection-name")].map((n) => n.textContent);
    expect(names).toEqual(["Alpha", "Beta"]);
  });

  it("filters by the searchable fields", async () => {
    const { user } = setup([item({ id: "a", title: "Alpha" }), item({ id: "b", title: "Beta", order: 1 })]);
    await user.type(screen.getByRole("searchbox", { name: /search case studies/i }), "bet");
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */

describe("CollectionTab editor", () => {
  it("renders exactly one editor at a time", async () => {
    const { user, container } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(container.querySelectorAll("#field-title")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(container.querySelectorAll("#field-title")).toHaveLength(1);
    // The add form is gone: the open editor is pre-filled from the row.
    expect(container.querySelector<HTMLInputElement>("#field-title")?.value).toBe("Alpha");
  });

  it("renders a field per non-internal spec, in spec order", async () => {
    const { user, container } = setup([]);
    await user.click(screen.getByRole("button", { name: /add/i }));
    const ids = [...container.querySelectorAll("[id^=field-]")].map((n) => n.id).filter((id) => !id.endsWith("-help") && !id.endsWith("-error"));
    expect(ids).toEqual(Object.keys(caseStudiesDef.fields).map((k) => `field-${k}`));
  });

  it("auto-fills the slug from the title on a new item, and stops once the slug is edited", async () => {
    const { user, container } = setup([]);
    await user.click(screen.getByRole("button", { name: /add/i }));
    const slug = () => container.querySelector<HTMLInputElement>("#field-slug")!;
    await user.type(container.querySelector<HTMLInputElement>("#field-title")!, "Hello World");
    expect(slug().value).toBe("hello-world");
    await user.clear(slug());
    await user.type(slug(), "custom");
    await user.type(container.querySelector<HTMLInputElement>("#field-title")!, "!");
    expect(slug().value).toBe("custom");
  });

  it("never auto-fills the slug while editing an existing item", async () => {
    const { user, container } = setup([item({ id: "a", slug: "kept", title: "Alpha" })]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(container.querySelector<HTMLInputElement>("#field-title")!, " Two");
    expect(container.querySelector<HTMLInputElement>("#field-slug")?.value).toBe("kept");
  });

  it("POSTs the whole form on create and refreshes", async () => {
    const { user, container, loadData, toast } = setup([]);
    await user.click(screen.getByRole("button", { name: /add/i }));
    await user.type(container.querySelector<HTMLInputElement>("#field-title")!, "New One");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    const [url, init] = lastCall();
    expect(url).toBe("/api/case-studies");
    expect(init.method).toBe("POST");
    expect(lastBody()).toMatchObject({ title: "New One", slug: "new-one", planetFeature: "none", stack: [] });
    expect(toast).toHaveBeenCalledWith("Case study created");
    // The editor closes on success.
    expect(container.querySelector("#field-title")).toBeNull();
  });

  it("PUTs to the item url on save", async () => {
    const { user, container, loadData } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(container.querySelector<HTMLInputElement>("#field-client")!, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    // The list refresh, not just the request, is what proves the mutation completed.
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(lastCall()[0]).toBe("/api/case-studies/a");
    expect(lastCall()[1].method).toBe("PUT");
    expect(lastBody()).toMatchObject({ client: "Acme" });
  });

  it("closes the editor on Escape without saving", async () => {
    const { user, container } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(container.querySelector<HTMLInputElement>("#field-title")!, "{Escape}");
    expect(container.querySelector("#field-title")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes the editor on Cancel without saving", async () => {
    const { user, container } = setup([]);
    await user.click(screen.getByRole("button", { name: /add/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(container.querySelector("#field-title")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ *
 * Singular naming (Task 12 carry-forward)
 * ------------------------------------------------------------------ */

describe("CollectionTab singular naming", () => {
  it("uses the `singular` prop in the editor headings", async () => {
    const { user } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByRole("heading", { name: "New case study" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit case study" })).toBeDefined();
  });

  it("uses the `singular` prop, capitalized, in the save/delete/publish toasts", async () => {
    const { user, container, toast } = setup([item({ id: "a", published: false })]);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(container.querySelector<HTMLInputElement>("#field-client")!, "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Case study saved"));

    await user.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Case study published"));

    await user.click(screen.getByRole("button", { name: /^delete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Case study deleted"));
  });

  it("falls back to the title minus a trailing s when no `singular` is given", async () => {
    const { user, toast } = setup([], servicesDef, { title: "Services", singular: undefined });
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByRole("heading", { name: "New service" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Service created"));
  });

  it("leaves the plural list hints and the search label alone", async () => {
    const { user } = setup([item({ id: "a" })]);
    expect(screen.getByRole("searchbox", { name: /search case studies/i })).toBeDefined();
    await user.type(screen.getByRole("searchbox", { name: /search case studies/i }), "zzz");
    expect(screen.getByText(/no case studies match your search/i)).toBeDefined();
  });
});

/* ------------------------------------------------------------------ *
 * Server error mapping
 * ------------------------------------------------------------------ */

describe("CollectionTab error mapping", () => {
  const openAdd = async (u: ReturnType<typeof setup>) => {
    await u.user.click(screen.getByRole("button", { name: /add/i }));
  };

  it("maps a 400 naming a field onto that field", async () => {
    fetchMock.mockResolvedValue(fail("title is required", 400));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(u.container.querySelector("#field-title-error")?.textContent).toBe("title is required"));
    expect(u.container.querySelector<HTMLInputElement>("#field-title")?.getAttribute("aria-invalid")).toBe("true");
    expect(u.loadData).not.toHaveBeenCalled();
    // The editor stays open so the user can fix the value.
    expect(u.container.querySelector("#field-title")).not.toBeNull();
  });

  it("falls back to a form-level alert when the 400 names no field", async () => {
    fetchMock.mockResolvedValue(fail("Body must be a JSON object", 400));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Body must be a JSON object"));
    expect(u.container.querySelector("#field-title-error")).toBeNull();
  });

  it("maps a 409 onto the slug field", async () => {
    fetchMock.mockResolvedValue(fail("slug already exists", 409));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(u.container.querySelector("#field-slug-error")?.textContent).toBe("slug already exists"));
  });

  it("clears a field error as soon as that field is edited", async () => {
    fetchMock.mockResolvedValue(fail("title is required", 400));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(u.container.querySelector("#field-title-error")).not.toBeNull());
    await u.user.type(u.container.querySelector<HTMLInputElement>("#field-title")!, "x");
    expect(u.container.querySelector("#field-title-error")).toBeNull();
  });

  it("logs admin.save_failed and shows an inline error when the request rejects — never console.error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("offline"));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(logClient).toHaveBeenCalledWith("admin.save_failed", expect.objectContaining({ verb: "create" }));
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("logs admin.save_failed for a non-OK response too", async () => {
    fetchMock.mockResolvedValue(fail("title is required", 400));
    const u = setup([]);
    await openAdd(u);
    await u.user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(logClient).toHaveBeenCalledWith("admin.save_failed", expect.objectContaining({ status: 400, verb: "create" })),
    );
  });
});

/* ------------------------------------------------------------------ *
 * Row actions
 * ------------------------------------------------------------------ */

describe("CollectionTab row actions", () => {
  it("requires a confirm before deleting", async () => {
    const { user, loadData } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: /^delete/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(lastCall()[0]).toBe("/api/case-studies/a");
    expect(lastCall()[1].method).toBe("DELETE");
  });

  it("shows a list-level error when a delete fails", async () => {
    fetchMock.mockResolvedValue(fail("CaseStudy not found", 404));
    const { user } = setup([item({ id: "a" })]);
    await user.click(screen.getByRole("button", { name: /^delete/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("CaseStudy not found"));
    expect(logClient).toHaveBeenCalledWith("admin.save_failed", expect.objectContaining({ verb: "delete" }));
  });

  it("toggles published through a PUT", async () => {
    const { user, loadData } = setup([item({ id: "a", published: false })]);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(lastCall()[0]).toBe("/api/case-studies/a");
    expect(lastBody()).toEqual({ published: true });
  });

  it("reorders through PUT /reorder with the swapped id list", async () => {
    const { user, loadData } = setup([
      item({ id: "a", title: "Alpha", order: 0 }),
      item({ id: "b", title: "Beta", order: 1 }),
    ]);
    await user.click(screen.getAllByRole("button", { name: /move .* down/i })[0]);
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    expect(lastCall()[0]).toBe("/api/case-studies/reorder");
    expect(lastBody()).toEqual({ ids: ["b", "a"] });
  });

  it("disables the move buttons at the ends of the list", () => {
    setup([item({ id: "a", title: "Alpha", order: 0 }), item({ id: "b", title: "Beta", order: 1 })]);
    const rows = document.querySelectorAll<HTMLElement>(".admin-skill-row");
    expect(within(rows[0]).getByRole<HTMLButtonElement>("button", { name: /move .* up/i }).disabled).toBe(true);
    expect(within(rows[1]).getByRole<HTMLButtonElement>("button", { name: /move .* down/i }).disabled).toBe(true);
  });

  it("hides reorder controls for a def that is not orderable", () => {
    // testimonialsDef is orderable; assert the inverse via a cloned non-orderable def.
    setup(
      [{ id: "t1", order: 0, createdAt: "2026-01-01T00:00:00.000Z", quote: "q", name: "n", role: "", company: "", published: true } as CollectionItem],
      { ...testimonialsDef, orderable: false },
    );
    expect(screen.queryByRole("button", { name: /move/i })).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * Task 11 carry-forwards: focus, long labels, in-flight disabling
 * ------------------------------------------------------------------ */

describe("CollectionTab editor affordances", () => {
  it("focuses the first field when the editor opens", async () => {
    const { user } = setup([]);
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    // Case studies' first editable field is the slug.
    expect(document.activeElement?.id).toBe("field-slug");
  });

  it("moves focus again when Edit opens a different row's editor", async () => {
    const { user } = setup([item({ id: "a", title: "Alpha" }), item({ id: "b", title: "Beta", order: 1 })]);
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    expect(document.activeElement?.id).toBe("field-slug");
    // Blur, then open a row editor: the editor stays "open" throughout, so a naive
    // open/closed effect would not refocus.
    (document.activeElement as HTMLElement).blur();
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(document.activeElement?.id).toBe("field-slug");
  });

  it("does not close the editor on Escape from a focused select", async () => {
    const { user } = setup([]);
    await user.click(screen.getByRole("button", { name: "+ Add" }));
    const select = document.querySelector<HTMLSelectElement>("#field-planetFeature")!;
    select.focus();
    await user.keyboard("{Escape}");
    expect(document.querySelector("#field-slug")).not.toBeNull();
    // …but Escape from a text field still closes it.
    document.querySelector<HTMLInputElement>("#field-title")!.focus();
    await user.keyboard("{Escape}");
    expect(document.querySelector("#field-slug")).toBeNull();
  });

  it("truncates a long primary label in the row and in the move buttons", () => {
    const quote = "Q".repeat(400);
    setup(
      [{ id: "t1", order: 0, createdAt: "2026-01-01T00:00:00.000Z", quote, name: "n", role: "", company: "", published: true } as CollectionItem],
      testimonialsDef,
    );
    const label = document.querySelector<HTMLElement>(".admin-collection-name")!;
    expect(label.textContent!.length).toBeLessThanOrEqual(60);
    expect(label.textContent!.endsWith("…")).toBe(true);
    // The untruncated value stays reachable as a tooltip.
    expect(label.title).toBe(quote);
    const up = screen.getByRole("button", { name: /move .* up/i });
    expect(up.getAttribute("aria-label")!.length).toBeLessThan(80);
  });

  it("leaves a short primary label untouched", () => {
    setup([item({ id: "a", title: "Alpha" })]);
    const label = document.querySelector<HTMLElement>(".admin-collection-name")!;
    expect(label.textContent).toBe("Alpha");
  });

  it("disables Add, Edit and Delete while a mutation is in flight", async () => {
    // A publish that never resolves keeps `saving` true for the assertion.
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { user } = setup([item({ id: "a", title: "Alpha" })]);
    await user.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByRole<HTMLButtonElement>("button", { name: "+ Add" }).disabled).toBe(true));
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Edit" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Delete" }).disabled).toBe(true);
  });
});
