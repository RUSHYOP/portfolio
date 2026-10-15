// Tests for the server-side markdown renderer: correctness of basic markdown
// features plus the security allow-list (XSS-focused) behaviour it must enforce.
import { describe, it, expect, vi } from "vitest";
import { marked } from "marked";
import { renderMarkdown, caseExcerpt } from "./markdown";

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

  // F4: the page already owns the <h1>; a markdown h1 would nest a second one under an h2.
  it("demotes a markdown h1 to h2 while keeping its text", () => {
    const html = renderMarkdown("# Title");
    expect(html).toContain("<h2>Title</h2>");
    expect(html).not.toContain("<h1");
  });

  // F12: an anchor with no href attribute at all must survive as plain link text.
  it("keeps the text of a raw anchor that has no href at all", () => {
    const html = renderMarkdown("<a>bare</a>");
    expect(html).toContain("bare");
    expect(html).not.toContain("href");
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

// Slice 5 (D3): the Worlds panels show a plain-text excerpt of each case-study section, built
// server-side so the client never receives the full markdown.
describe("caseExcerpt", () => {
  it("returns an empty string for empty, whitespace-only and non-string input", () => {
    expect(caseExcerpt("")).toBe("");
    expect(caseExcerpt("  \n\n \t")).toBe("");
    expect(caseExcerpt(undefined as unknown as string)).toBe("");
    expect(caseExcerpt(42 as unknown as string)).toBe("");
  });

  it("takes the first paragraph, skipping a leading heading, and ignores the rest", () => {
    expect(caseExcerpt("## Context\n\nFirst para.\n\nSecond para.")).toBe("First para.");
    expect(caseExcerpt("First para.\n\n- a list\n\n> a quote")).toBe("First para.");
  });

  it("reduces emphasis, code, links and strikethrough to their text, drops images, and joins soft line breaks", () => {
    const md = "A **bold** and _soft_ move with `code`, a [link](https://example.com) and ~~gone~~ text\nacross lines ![diagram](/a.png) end.";
    expect(caseExcerpt(md)).toBe("A bold and soft move with code, a link and gone text across lines end.");
  });

  it("strips raw HTML tags, keeps their text, and drops script and style content", () => {
    expect(caseExcerpt("Hello <b>big</b> <em>world</em>")).toBe("Hello big world");
    expect(caseExcerpt("Safe <script>alert(1)</script> text <style>p{color:red}</style>here")).toBe("Safe text here");
  });

  it("decodes the entities and escapes marked leaves in the text", () => {
    expect(caseExcerpt("Fish &amp; chips &lt;3 &quot;quoted&quot; \\*literal\\*")).toBe('Fish & chips <3 "quoted" *literal*');
  });

  it("falls back to the first list item, then to a blockquote, when there is no paragraph", () => {
    expect(caseExcerpt("## Notes\n\n- first **item**\n- second")).toBe("first item");
    expect(caseExcerpt("> quoted **claim**\n>\n> more")).toBe("quoted claim");
  });

  it("skips a paragraph that is only an image or markup and uses the next one with text", () => {
    expect(caseExcerpt("![only an image](/a.png)\n\nThe real text.")).toBe("The real text.");
  });

  it("returns an empty string when there is nothing to quote (heading only, code only, rule only)", () => {
    expect(caseExcerpt("# Just a heading")).toBe("");
    expect(caseExcerpt("```\nconst x = 1;\n```")).toBe("");
    expect(caseExcerpt("---")).toBe("");
  });

  it("returns short text whole, with no ellipsis, up to and including max characters", () => {
    expect(caseExcerpt("Short and sweet.")).toBe("Short and sweet.");
    const exact = "a".repeat(9) + " " + "b".repeat(10);          // 20 chars
    expect(caseExcerpt(exact, 20)).toBe(exact);
  });

  it("cuts at the last word boundary within max and appends an ellipsis, never mid-word", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
    const out = caseExcerpt(text, 24);
    expect(out).toBe("alpha beta gamma delta…");
    // Property: the visible part is a prefix of the source, ends on a whole word, and is <= max.
    const head = out.slice(0, -1);
    expect(text.startsWith(head)).toBe(true);
    expect(text[head.length]).toBe(" ");
    expect(head.length).toBeLessThanOrEqual(24);
  });

  it("treats a space exactly at the cut as a boundary", () => {
    expect(caseExcerpt("12345 67890 abcde", 11)).toBe("12345 67890…");
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(caseExcerpt("First clause, second clause; third clause - fourth", 14)).toBe("First clause…");
    expect(caseExcerpt("Ends here. Then more words follow on", 12)).toBe("Ends here…");
  });

  it("hard-cuts a single over-long word at max, without splitting a surrogate pair", () => {
    expect(caseExcerpt("x".repeat(50), 10)).toBe("x".repeat(10) + "…");
    const emoji = "😀".repeat(20);                                 // 2 UTF-16 units each
    const out = caseExcerpt(emoji, 11);
    expect(out.endsWith("…")).toBe(true);
    expect(out.slice(0, -1)).toBe("😀".repeat(5));                   // 10 units: never a lone half
  });

  it("defaults to 160 characters and falls back to it for a nonsense max", () => {
    const long = "word ".repeat(80);                               // 400 chars
    for (const out of [caseExcerpt(long), caseExcerpt(long, NaN), caseExcerpt(long, 0), caseExcerpt(long, -5)]) {
      expect(out.endsWith("…")).toBe(true);
      expect(out.length).toBeGreaterThan(150);
      expect(out.length).toBeLessThanOrEqual(161);
    }
  });

  it("never throws: a lexer failure is logged (never the source) and gives an empty string", () => {
    vi.mocked(appendLog).mockClear();
    const spy = vi.spyOn(marked, "lexer").mockImplementationOnce(() => {
      throw new Error("lexer boom");
    });
    let out = "x";
    expect(() => {
      out = caseExcerpt("secret source text");
    }).not.toThrow();
    expect(out).toBe("");
    expect(appendLog).toHaveBeenCalledWith(
      "markdown",
      expect.objectContaining({ level: "error", message: expect.stringContaining("lexer boom") })
    );
    const [, record] = vi.mocked(appendLog).mock.calls[0] as [string, Record<string, unknown>];
    expect(JSON.stringify(record)).not.toContain("secret source text");
    spy.mockRestore();
  });
});
