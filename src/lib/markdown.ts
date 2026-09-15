// Server-only markdown renderer for CMS-authored fields (problem/architecture/outcome).
// Not marked "server-only" package-wise (not in the brief's dependency list) — see
// task-6-report.md for the deviation note; callers must only import this from server code.
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { appendLog } from "./log";

// Sync parsing only — we never await marked.parse, so disable its async/extension path.
marked.setOptions({ gfm: true, breaks: false, async: false });

// Only http(s)/mailto hrefs are trusted. sanitize-html's `allowedSchemes` only filters
// hrefs that carry a scheme, so relative paths ("/etc/passwd", "foo/bar") and
// protocol-relative ("//evil.example") sail through untouched — this regex is the real
// gate; `allowedSchemes`/`allowProtocolRelative` below are defence in depth only.
const SAFE_HREF = /^(https?:|mailto:)/i;

// Exact allow-list from the brief: minimal tag set, href-only anchor attributes,
// http/https/mailto schemes only, no protocol-relative URLs (blocks //evil.example).
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "code", "pre", "a", "blockquote", "br", "hr"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    // The page already owns the <h1>; a markdown h1 would nest a second one under an h2.
    // simpleTransform (not removing "h1" from allowedTags) keeps the heading, only demoted.
    h1: sanitizeHtml.simpleTransform("h2", {}),
    a: (tagName, attribs) => {
      const href = attribs.href?.trim();
      if (href && SAFE_HREF.test(href)) {
        // Valid scheme: keep href, force safe rel/target so authored links can't reverse-tab-nab.
        return { tagName, attribs: { ...attribs, href, rel: "noopener noreferrer", target: "_blank" } };
      }
      // Unsafe/relative/missing href: drop href entirely (keep the link text) and skip
      // rel/target too — a dead anchor with target/rel but no destination is a wart.
      const { href: _href, rel: _rel, target: _target, ...rest } = attribs;
      return { tagName, attribs: rest };
    },
  },
};

// Fallback escaping used only if marked/sanitize-html throw unexpectedly.
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Markdown → sanitised HTML. Raw HTML in the source is stripped. Never throws. */
export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return "";
  try {
    const raw = marked.parse(md) as string;
    return sanitizeHtml(raw, SANITIZE).trim();
  } catch (e) {
    // Fire-and-forget structured log of the failure; never log the raw markdown source
    // (may contain user-authored content). Swallow logging errors too — logging must
    // never affect this function's synchronous, never-throws contract.
    void appendLog("markdown", { level: "error", message: String(e) }).catch(() => {});
    // Defensive fallback: escape and wrap so we still return safe, renderable output.
    return `<p>${escapeHtml(md)}</p>`;
  }
}
