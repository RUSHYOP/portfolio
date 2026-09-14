// Tests for the server-side markdown renderer: correctness of basic markdown
// features plus the security allow-list (XSS-focused) behaviour it must enforce.
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders headings, lists, emphasis and code", () => {
    const html = renderMarkdown("## Title\n\n- one\n- **two**\n\n`x`");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<strong>two</strong>");
    expect(html).toContain("<code>x</code>");
  });

  it("drops raw HTML and script", () => {
    const html = renderMarkdown('hello <script>alert(1)</script> <img src=x onerror=alert(1)> <div>d</div>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<div");
    expect(html).toContain("hello");
  });

  it("allows http(s)/mailto links with safe rel/target and strips javascript:", () => {
    const ok = renderMarkdown("[a](https://example.com) [m](mailto:x@y.z)");
    expect(ok).toContain('href="https://example.com"');
    expect(ok).toContain('rel="noopener noreferrer"');
    expect(ok).toContain('target="_blank"');
    const bad = renderMarkdown("[x](javascript:alert(1))");
    expect(bad).not.toContain("javascript:");
  });

  it("returns escaped text for empty or degenerate input and never throws", () => {
    expect(renderMarkdown("")).toBe("");
    expect(() => renderMarkdown("<" .repeat(5000))).not.toThrow();
  });

  // --- Additional XSS / robustness cases beyond the brief's minimum set ---

  it("strips javascript: hrefs even without markdown link syntax (raw anchor)", () => {
    const html = renderMarkdown('<a href="javascript:alert(1)">click</a>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script");
  });

  it("strips onerror and other event-handler attributes from img tags", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
  });

  it("removes <script> tags including their inline content", () => {
    const html = renderMarkdown("before <script>window.location='http://evil.example'</script> after");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("evil.example");
    expect(html).toContain("before");
    expect(html).toContain("after");
  });

  it("never throws on nested or unclosed tag input", () => {
    expect(() => renderMarkdown("<div><span><b>unclosed")).not.toThrow();
    expect(() => renderMarkdown("<<<script>>>alert(1)<<<//script>>>")).not.toThrow();
    expect(() => renderMarkdown("<a href=<a href=x>>>>")).not.toThrow();
    const html = renderMarkdown("<div><span><b>unclosed");
    expect(html).not.toContain("<div");
    expect(html).not.toContain("<span");
  });
});
