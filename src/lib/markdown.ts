// Server-only markdown renderer for CMS-authored fields (problem/architecture/outcome).
// Not marked "server-only" package-wise (not in the brief's dependency list) — see
// task-6-report.md for the deviation note; callers must only import this from server code.
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// Sync parsing only — we never await marked.parse, so disable its async/extension path.
marked.setOptions({ gfm: true, breaks: false, async: false });

// Exact allow-list from the brief: minimal tag set, href-only anchor attributes,
// http/https/mailto schemes only, no protocol-relative URLs (blocks //evil.example).
const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["h1", "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "code", "pre", "a", "blockquote", "br", "hr"],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // Force safe rel/target on every surviving anchor so authored links can't reverse-tab-nab.
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" } }),
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
  } catch {
    // Defensive fallback: escape and wrap so we still return safe, renderable output.
    return `<p>${escapeHtml(md)}</p>`;
  }
}
