// @vitest-environment jsdom
// Only the component tests need a DOM; the rest of the suite stays on `node`.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCallback, useState } from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CollectionItem } from "./types";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double, never rendered in the app
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
vi.mock("@/lib/clientLog", () => ({ logClient: vi.fn(), LOG_EVENTS: [] }));

const { default: ConsultingTab } = await import("./ConsultingTab");

afterEach(cleanup);

const svc = (id: string, title: string): CollectionItem =>
  ({ id, order: 0, createdAt: "2026-01-01T00:00:00.000Z", title, promise: "p", outcomes: [], engagement: "" }) as CollectionItem;
const step = (id: string, title: string): CollectionItem =>
  ({ id, order: 0, createdAt: "2026-01-01T00:00:00.000Z", title, what: "w", deliverable: "", duration: "" }) as CollectionItem;

const noop = async () => {};
const upload = async () => null;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
});
afterEach(() => vi.unstubAllGlobals());

/**
 * Mirrors the admin page: an inline arrow (new identity every render) that only
 * re-renders when the merged dirty flag actually changes. A ConsultingTab that simply
 * forwards both children's flags to one callback flip-flops here forever.
 */
function Harness({ spy }: { spy: (d: boolean) => void }) {
  const [dirty, setDirty] = useState(false);
  const report = useCallback(
    (d: boolean) => {
      spy(d);
      setDirty((prev) => (prev === d ? prev : d));
    },
    [spy],
  );
  return (
    <>
      <span data-testid="dirty">{String(dirty)}</span>
      <ConsultingTab
        services={[svc("svc_1", "Alpha")]}
        process={[step("step_1", "Discovery")]}
        toast={() => {}}
        loadData={noop}
        uploadFile={upload}
        uploading={false}
        onDirtyChange={(d) => report(d)}
      />
    </>
  );
}

describe("ConsultingTab", () => {
  it("renders both collections with their own headings and items", () => {
    render(
      <ConsultingTab services={[svc("svc_1", "Alpha")]} process={[step("step_1", "Discovery")]} toast={() => {}} loadData={noop} uploadFile={upload} uploading={false} />,
    );
    expect(screen.getByRole("heading", { name: "Services" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Process steps" })).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Discovery")).toBeDefined();
  });

  it("merges the two editors into one dirty flag and settles (no update loop)", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    expect(screen.getByTestId("dirty").textContent).toBe("false");

    // Open the Services editor only; the merged flag must be true and stay true.
    const services = screen.getByRole("heading", { name: "Services" }).closest("section")!;
    await user.click(within(services).getByRole("button", { name: "+ Add" }));

    expect(screen.getByTestId("dirty").textContent).toBe("true");
    expect(spy.mock.calls.at(-1)?.[0]).toBe(true);
    // A flip-flop would run away into the hundreds; the settled path reports a handful.
    expect(spy.mock.calls.length).toBeLessThan(12);
  });

  it("clears the merged flag once the open editor is cancelled", async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const process = screen.getByRole("heading", { name: "Process steps" }).closest("section")!;
    await user.click(within(process).getByRole("button", { name: "+ Add" }));
    expect(screen.getByTestId("dirty").textContent).toBe("true");

    await user.click(within(process).getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });
});
