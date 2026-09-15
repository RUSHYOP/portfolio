// @vitest-environment jsdom
// Only this file needs a DOM; the rest of the suite stays on the global `node` environment.
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { SLUG_RE, type FieldSpec, type FieldValue } from "@/lib/collections/fieldSpec";

// next/image needs the Next runtime; a plain <img> is enough for markup assertions.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double, never rendered in the app
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const { default: FieldInput } = await import("./FieldInput");

// vitest.config.mts has no `globals: true`, so RTL's auto-cleanup hook never registers.
afterEach(cleanup);

/* ------------------------------------------------------------------ *
 * Static markup assertions (no DOM interaction)
 * ------------------------------------------------------------------ */

const markup = (spec: FieldSpec, value: FieldValue, extra: { error?: string } = {}) =>
  renderToStaticMarkup(<FieldInput name="f" spec={spec} value={value} onChange={() => {}} {...extra} />);

/** Parse rendered markup so assertions can target a specific element/attribute. */
const parse = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
};

describe("FieldInput markup", () => {
  it("wires label htmlFor to the control id and marks required fields", () => {
    const html = markup({ type: "text", label: "Title", required: true }, "hi");
    expect(html).toContain('for="field-f"');
    expect(html).toContain('id="field-f"');
    expect(html).toContain('class="admin-required"');
    expect(html).toContain('aria-required="true"');
  });

  it("shows a character counter only when max is set on a counted type", () => {
    expect(markup({ type: "text", label: "T", max: 10 }, "abc")).toContain("3 / 10");
    expect(markup({ type: "text", label: "T" }, "abc")).not.toContain("admin-char-count");
    expect(markup({ type: "number", label: "N", max: 10 }, 3)).not.toContain("admin-char-count");
  });

  it("renders toggle as an accessible switch reflecting the value", () => {
    expect(markup({ type: "toggle", label: "Published" }, true)).toContain('role="switch"');
    expect(markup({ type: "toggle", label: "Published" }, true)).toContain('aria-checked="true"');
    expect(markup({ type: "toggle", label: "Published" }, false)).toContain('aria-checked="false"');
  });

  it("renders every select option from the spec with no placeholder when the value matches", () => {
    const host = parse(
      markup(
        { type: "select", label: "Status", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] },
        "b",
      ),
    );
    const options = [...host.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toEqual(["Alpha", "Beta"]);
    // Tightened from `not.toContain("Select")`: no option is a disabled placeholder.
    expect(options.every((o) => !o.disabled)).toBe(true);
  });

  it("adds a disabled placeholder option when the value matches no option", () => {
    const host = parse(markup({ type: "select", label: "Status", options: [{ value: "a", label: "Alpha" }] }, ""));
    const options = [...host.querySelectorAll("option")];
    expect(options[0]?.disabled).toBe(true);
    expect(options[0]?.textContent).toBe("Select…");
    expect(options[1]?.disabled).toBe(false);
  });

  it("renders one removable chip per item and disables the input at maxItems", () => {
    const host = parse(markup({ type: "chips", label: "Tags", maxItems: 2 }, ["x", "y"]));
    expect(host.querySelector('[aria-label="Remove x"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Remove y"]')).not.toBeNull();
    // Tightened from `toContain("disabled")`: the chip input specifically is disabled.
    const input = host.querySelector<HTMLInputElement>("input.admin-chip-input");
    expect(input?.disabled).toBe(true);
    expect(input?.placeholder).toBe("Max reached");
  });

  it("previews an image only when a value is set, labels Remove, and disables upload without an uploader", () => {
    const host = parse(markup({ type: "image", label: "Diagram" }, "/api/media/1"));
    expect(host.querySelector("img")?.getAttribute("src")).toBe("/api/media/1");
    expect(host.querySelector("img")?.getAttribute("alt")).toBe("Diagram");
    expect(host.querySelector('[aria-label="Remove Diagram"]')?.textContent).toBe("Remove");
    expect(host.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);
    expect(markup({ type: "image", label: "Diagram" }, "")).not.toContain("<img");
  });

  it("links help and error text to the control via aria-describedby", () => {
    const html = markup({ type: "text", label: "T", help: "Some hint" }, "", { error: "Too short" });
    expect(html).toContain('aria-describedby="field-f-help field-f-error"');
    expect(html).toContain('id="field-f-help"');
    expect(html).toContain('id="field-f-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("renders the remaining types without a preview pane", () => {
    expect(markup({ type: "textarea", label: "T" }, "a")).toContain("<textarea");
    const md = markup({ type: "markdown", label: "Body" }, "# hi");
    expect(md).toContain("<textarea");
    expect(md).not.toContain("admin-preview");
    expect(markup({ type: "slug", label: "Slug" }, "my-slug")).toContain('value="my-slug"');
    expect(markup({ type: "number", label: "N" }, 7)).toContain('type="number"');
  });

  it("does not suppress the native focus ring on select or number, and keeps the dark color-scheme", () => {
    // FieldInput cannot be mounted in the running app, so the focus ring is verified by
    // asserting the inline style never sets `outline` (the UA ring survives) instead.
    for (const html of [
      markup({ type: "select", label: "S", options: [{ value: "a", label: "Alpha" }] }, "a"),
      markup({ type: "number", label: "N" }, 1),
    ]) {
      const el = parse(html).querySelector("select, input[type=number]");
      const style = el?.getAttribute("style") ?? "";
      expect(style).not.toMatch(/outline/);
      expect(style).toMatch(/color-scheme:\s*dark/);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Interaction tests (jsdom + RTL, controlled harness)
 * ------------------------------------------------------------------ */

function Harness({
  spec,
  initial,
  onChange,
  uploadFile,
}: {
  spec: FieldSpec;
  initial: FieldValue;
  onChange: (v: FieldValue) => void;
  uploadFile?: (file: File, type: "diagram") => Promise<string | null>;
}) {
  // Feeds the new value straight back as `value`, exactly as a real form would.
  const [v, setV] = useState<FieldValue>(initial);
  return (
    <FieldInput
      name="f"
      spec={spec}
      value={v}
      uploadFile={uploadFile}
      onChange={(next) => {
        setV(next);
        onChange(next);
      }}
    />
  );
}

function setup(spec: FieldSpec, initial: FieldValue, uploadFile?: (f: File, t: "diagram") => Promise<string | null>) {
  const spy = vi.fn();
  const user = userEvent.setup();
  const utils = render(<Harness spec={spec} initial={initial} onChange={spy} uploadFile={uploadFile} />);
  return { spy, user, ...utils };
}

const last = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)?.[0];

describe("FieldInput chips interaction", () => {
  const spec: FieldSpec = { type: "chips", label: "Tags" };

  it("commits the draft on Enter", async () => {
    const { spy, user } = setup(spec, []);
    await user.type(screen.getByRole("textbox"), "a{Enter}");
    expect(last(spy)).toEqual(["a"]);
  });

  it("commits the draft on comma", async () => {
    const { spy, user } = setup(spec, ["a"]);
    await user.type(screen.getByRole("textbox"), "b,");
    expect(last(spy)).toEqual(["a", "b"]);
    expect(screen.getByRole<HTMLInputElement>("textbox").value).toBe("");
  });

  it("removes the last chip on Backspace with an empty draft", async () => {
    const { spy, user } = setup(spec, ["a", "b"]);
    await user.type(screen.getByRole("textbox"), "{Backspace}");
    expect(last(spy)).toEqual(["a"]);
  });

  it("ignores a whitespace-only draft", async () => {
    const { spy, user } = setup(spec, []);
    await user.type(screen.getByRole("textbox"), "   {Enter}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores a duplicate of an existing chip", async () => {
    const { spy, user } = setup(spec, ["a"]);
    await user.type(screen.getByRole("textbox"), "a{Enter}");
    expect(spy).not.toHaveBeenCalled();
    // The draft still clears — the value the user asked for is already present.
    expect(screen.getByRole<HTMLInputElement>("textbox").value).toBe("");
  });

  it("disables the input and emits nothing once maxItems is reached", async () => {
    const { spy, user } = setup({ type: "chips", label: "Tags", maxItems: 1 }, ["a"]);
    const input = screen.getByRole<HTMLInputElement>("textbox");
    expect(input.disabled).toBe(true);
    await user.type(input, "b{Enter}");
    expect(spy).not.toHaveBeenCalled();
  });

  it("removes a chip via its labelled remove button", async () => {
    const { spy, user } = setup(spec, ["a", "b"]);
    await user.click(screen.getByLabelText("Remove a"));
    expect(last(spy)).toEqual(["b"]);
  });
});

describe("FieldInput number interaction", () => {
  const spec: FieldSpec = { type: "number", label: "Order" };

  it("emits the typed number", async () => {
    const { spy, user } = setup(spec, "");
    await user.type(screen.getByRole("spinbutton"), "12");
    expect(last(spy)).toBe(12);
    expect(spy.mock.calls.every(([v]) => Number.isFinite(v))).toBe(true);
  });

  it("emits a decimal value", async () => {
    const { spy, user } = setup(spec, "");
    await user.type(screen.getByRole("spinbutton"), "1.5");
    expect(last(spy)).toBe(1.5);
  });

  it("emits nothing for a lone minus sign", async () => {
    const { spy, user } = setup(spec, "");
    await user.type(screen.getByRole("spinbutton"), "-");
    expect(spy).not.toHaveBeenCalled();
  });

  it("emits nothing when the field is cleared", async () => {
    const { spy, user } = setup(spec, 7);
    await user.clear(screen.getByRole("spinbutton"));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLInputElement>("spinbutton").value).toBe("");
  });
});

describe("FieldInput slug interaction", () => {
  const spec: FieldSpec = { type: "slug", label: "Slug" };

  it("slugifies as the user types", async () => {
    const { spy, user } = setup(spec, "");
    await user.type(screen.getByRole("textbox"), "Hello World");
    expect(last(spy)).toBe("hello-world");
  });

  it("collapses hyphen runs on paste", async () => {
    const { spy, user } = setup(spec, "");
    await user.click(screen.getByRole("textbox"));
    await user.paste("Hello - World");
    expect(last(spy)).toBe("hello-world");
  });

  it("never emits a leading hyphen or a doubled hyphen while typing", async () => {
    const { spy, user } = setup(spec, "");
    await user.type(screen.getByRole("textbox"), "  -Foo -- Bar! ");
    for (const [v] of spy.mock.calls) {
      expect(typeof v === "string" && !v.startsWith("-") && !v.includes("--")).toBe(true);
    }
    const final = last(spy) as string;
    // A single trailing hyphen is allowed mid-typing; otherwise the value is a valid slug.
    expect(final === "" || SLUG_RE.test(final.replace(/-$/, ""))).toBe(true);
  });
});

describe("FieldInput toggle interaction", () => {
  const spec: FieldSpec = { type: "toggle", label: "Published" };

  it("flips on click and reflects aria-checked", async () => {
    const { spy, user } = setup(spec, false);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    await user.click(sw);
    expect(spy).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
  });

  it("is operable with Space and Enter", async () => {
    const { spy, user } = setup(spec, false);
    screen.getByRole("switch").focus();
    await user.keyboard("[Space]");
    await user.keyboard("[Enter]");
    expect(spy.mock.calls.map(([v]) => v)).toEqual([true, false]);
  });
});

describe("FieldInput select interaction", () => {
  const spec: FieldSpec = {
    type: "select",
    label: "Status",
    options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }],
  };

  it("emits the chosen option value", async () => {
    const { spy, user } = setup(spec, "a");
    await user.selectOptions(screen.getByRole("combobox"), "b");
    expect(spy).toHaveBeenCalledWith("b");
  });

  it("shows the disabled placeholder while the value is empty", () => {
    setup(spec, "");
    expect(screen.getByRole<HTMLSelectElement>("combobox").value).toBe("");
    expect(screen.getByRole<HTMLOptionElement>("option", { name: "Select…" }).disabled).toBe(true);
  });
});

describe("FieldInput image interaction", () => {
  const spec: FieldSpec = { type: "image", label: "Diagram" };
  const file = () => new File(["x"], "d.png", { type: "image/png" });

  const fileInput = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[type="file"]')!;

  it("uploads the picked file as a diagram and stores the returned url", async () => {
    const uploadFile = vi.fn<(f: File, t: "diagram") => Promise<string | null>>().mockResolvedValue("/api/media/9");
    const { spy, user, container } = setup(spec, "", uploadFile);
    const picked = file();
    await user.upload(fileInput(container), picked);
    await waitFor(() => expect(spy).toHaveBeenCalledWith("/api/media/9"));
    expect(uploadFile).toHaveBeenCalledWith(picked, "diagram");
  });

  it("resets the file input even when the upload fails", async () => {
    const uploadFile = vi.fn<(f: File, t: "diagram") => Promise<string | null>>().mockResolvedValue(null);
    const { spy, user, container } = setup(spec, "", uploadFile);
    await user.upload(fileInput(container), file());
    await waitFor(() => expect(uploadFile).toHaveBeenCalled());
    expect(spy).not.toHaveBeenCalled();
    expect(fileInput(container).value).toBe("");
  });

  it("resets the file input when the upload rejects, without an unhandled rejection", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const uploadFile = vi
      .fn<(f: File, t: "diagram") => Promise<string | null>>()
      .mockRejectedValue(new Error("network"));
    const { spy, user, container } = setup(spec, "", uploadFile);
    await user.upload(fileInput(container), file());
    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(spy).not.toHaveBeenCalled();
    expect(fileInput(container).value).toBe("");
    logged.mockRestore();
  });

  it("clears the value from the Remove button", async () => {
    const uploadFile = vi.fn<(f: File, t: "diagram") => Promise<string | null>>();
    const { spy, user } = setup(spec, "/api/media/9", uploadFile);
    await user.click(screen.getByLabelText("Remove Diagram"));
    expect(spy).toHaveBeenCalledWith("");
  });
});

describe("FieldInput text interaction", () => {
  it("updates the character counter as the user types", async () => {
    const { user, container } = setup({ type: "text", label: "Title", max: 20 }, "");
    const counter = () => container.querySelector(".admin-char-count")?.textContent;
    expect(counter()).toBe("0 / 20");
    await user.type(screen.getByRole("textbox"), "abcd");
    expect(counter()).toBe("4 / 20");
  });
});
