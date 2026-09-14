// Tests for the server-side markdown renderer: correctness of basic markdown
// features plus the security allow-list (XSS-focused) behaviour it must enforce.
import { describe, it, expect, vi } from "vitest";
import { marked } from "marked";
import { renderMarkdown } from "./markdown";

// Mock the structured logger so the error-path test doesn't touch the real filesystem
// and so we can assert the catch block actually logs.
vi.mock("./log", () => ({ appendLog: vi.fn().mockResolvedValue(undefined) }));
import { appendLog } from "./log";

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

  // --- Finding 1: non-http(s)/mailto hrefs (including relative paths) must be dropped ---

  it("strips tel: and ftp: hrefs (proves the custom scheme list is enforced, not sanitize-html's defaults)", () => {
    const tel = renderMarkdown("[t](tel:+15551234567)");
    expect(tel).not.toContain("tel:");
    expect(tel).not.toContain("href");
    expect(tel).toContain(">t<");

    const ftp = renderMarkdown("[f](ftp://example.com/file)");
    expect(ftp).not.toContain("ftp:");
    expect(ftp).not.toContain("href");
  });

  it("strips protocol-relative hrefs", () => {
    const html = renderMarkdown("[e](//evil.example)");
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("href");
  });

  it("strips relative-path hrefs (absolute-path and bare-relative)", () => {
    const abs = renderMarkdown("[x](/etc/passwd)");
    expect(abs).not.toContain("/etc/passwd");
    expect(abs).not.toContain("href");

    const rel = renderMarkdown("[x](foo/bar)");
    expect(rel).not.toContain("foo/bar");
    expect(rel).not.toContain("href");
  });

  it("keeps mailto: and https:// hrefs with safe rel/target", () => {
    const html = renderMarkdown("[m](mailto:x@y.z) [h](https://example.com)");
    expect(html).toContain('href="mailto:x@y.z"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("keeps uppercase-scheme hrefs (case-insensitive match)", () => {
    const html = renderMarkdown("[h](HTTPS://example.com)");
    expect(html).toContain("HTTPS://example.com");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("does not add rel/target to an anchor whose href was stripped", () => {
    const html = renderMarkdown("[x](/etc/passwd)");
    expect(html).not.toContain("rel=");
    expect(html).not.toContain("target=");
  });

  // --- Finding 2: render errors are logged, never throw, and still return a safe fallback ---

  it("logs render errors via appendLog and returns the escaped fallback, without throwing", async () => {
    vi.mocked(appendLog).mockClear();
    // Force the primary render path to throw so we exercise the catch block.
    const spy = vi.spyOn(marked, "parse").mockImplementationOnce(() => {
      throw new Error("boom");
    });

    let html = "";
    expect(() => {
      html = renderMarkdown("<b>hi</b>");
    }).not.toThrow();

    expect(html).toBe("<p>&lt;b&gt;hi&lt;/b&gt;</p>");
    expect(appendLog).toHaveBeenCalledWith(
      "markdown",
      expect.objectContaining({ level: "error", message: expect.stringContaining("boom") })
    );
    // Never log the raw markdown source.
    const [, record] = vi.mocked(appendLog).mock.calls[0] as [string, Record<string, unknown>];
    expect(JSON.stringify(record)).not.toContain("<b>hi</b>");

    spy.mockRestore();
  });
});
