import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { FieldSpec, FieldValue } from "@/lib/collections/fieldSpec";

// next/image needs the Next runtime; a plain <img> is enough for markup assertions.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test double, never rendered in the app
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const { default: FieldInput } = await import("./FieldInput");

const render = (spec: FieldSpec, value: FieldValue, extra: { error?: string } = {}) =>
  renderToStaticMarkup(<FieldInput name="f" spec={spec} value={value} onChange={() => {}} {...extra} />);

describe("FieldInput markup", () => {
  it("wires label htmlFor to the control id and marks required fields", () => {
    const html = render({ type: "text", label: "Title", required: true }, "hi");
    expect(html).toContain('for="field-f"');
    expect(html).toContain('id="field-f"');
    expect(html).toContain('class="admin-required"');
    expect(html).toContain('aria-required="true"');
  });

  it("shows a character counter only when max is set on a counted type", () => {
    expect(render({ type: "text", label: "T", max: 10 }, "abc")).toContain("3 / 10");
    expect(render({ type: "text", label: "T" }, "abc")).not.toContain("admin-char-count");
    expect(render({ type: "number", label: "N", max: 10 }, 3)).not.toContain("admin-char-count");
  });

  it("renders toggle as an accessible switch reflecting the value", () => {
    expect(render({ type: "toggle", label: "Published" }, true)).toContain('role="switch"');
    expect(render({ type: "toggle", label: "Published" }, true)).toContain('aria-checked="true"');
    expect(render({ type: "toggle", label: "Published" }, false)).toContain('aria-checked="false"');
  });

  it("renders every select option from the spec", () => {
    const html = render(
      { type: "select", label: "Status", options: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }] },
      "b",
    );
    expect(html).toContain(">Alpha</option>");
    expect(html).toContain(">Beta</option>");
    expect(html).not.toContain("Select");
  });

  it("adds a disabled placeholder option when the value matches no option", () => {
    const html = render({ type: "select", label: "Status", options: [{ value: "a", label: "Alpha" }] }, "");
    expect(html).toContain("disabled");
    expect(html).toContain("Select");
  });

  it("renders one removable chip per item and disables the input at maxItems", () => {
    const html = render({ type: "chips", label: "Tags", maxItems: 2 }, ["x", "y"]);
    expect(html).toContain('aria-label="Remove x"');
    expect(html).toContain('aria-label="Remove y"');
    expect(html).toContain("disabled");
    expect(html).toContain("Max reached");
  });

  it("previews an image only when a value is set, and disables upload without an uploader", () => {
    const withImg = render({ type: "image", label: "Diagram" }, "/api/media/1");
    expect(withImg).toContain('src="/api/media/1"');
    expect(withImg).toContain('alt="Diagram"');
    expect(withImg).toContain("Remove");
    expect(render({ type: "image", label: "Diagram" }, "")).not.toContain("<img");
  });

  it("links help and error text to the control via aria-describedby", () => {
    const html = render({ type: "text", label: "T", help: "Some hint" }, "", { error: "Too short" });
    expect(html).toContain('aria-describedby="field-f-help field-f-error"');
    expect(html).toContain('id="field-f-help"');
    expect(html).toContain('id="field-f-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("renders the remaining types without a preview pane", () => {
    expect(render({ type: "textarea", label: "T" }, "a")).toContain("<textarea");
    const md = render({ type: "markdown", label: "Body" }, "# hi");
    expect(md).toContain("<textarea");
    expect(md).not.toContain("admin-preview");
    expect(render({ type: "slug", label: "Slug" }, "my-slug")).toContain('value="my-slug"');
    expect(render({ type: "number", label: "N" }, 7)).toContain('type="number"');
  });
});
