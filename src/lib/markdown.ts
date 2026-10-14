// Server-only markdown renderer for CMS-authored fields (problem/architecture/outcome).
// Not marked "server-only" package-wise (not in the brief's dependency list) — see
// task-6-report.md for the deviation note; callers must only import this from server code.
import { marked, type Token, type Tokens } from "marked";
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

/* ---- Plain-text excerpts (slice 5, D3) ---- */

/** Default length of a Worlds panel excerpt: ~3 lines in a 190px column. */
export const EXCERPT_MAX = 160;

const ELLIPSIS = "\u2026";

// marked leaves entities in its text tokens as written (`&amp;` stays `&amp;`), and the excerpt
// is rendered as a plain React text node, so the handful marked users actually write are decoded.
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Flattens inline tokens to their visible text: formatting, links and code keep their text,
 *  images and raw HTML tags are dropped, and whatever sits between <script>/<style> is dropped
 *  too (the tags are `html` tokens, the payload a `text` token). */
function inlineText(tokens: Token[]): string {
  let out = "";
  let hidden = false;
  for (const t of tokens) {
    if (t.type === "html") {
      const tag = /^<(\/?)(script|style)\b/i.exec(t.raw);
      if (tag) hidden = tag[1] === "";
      continue;
    }
    if (hidden || t.type === "image") continue;
    if (t.type === "br") out += " ";
    else if ("tokens" in t && Array.isArray(t.tokens) && t.tokens.length > 0) out += inlineText(t.tokens);
    else if ("text" in t && typeof t.text === "string") out += t.text;
  }
  return out;
}

const squash = (s: string) => decodeEntities(s).replace(/\s+/g, " ").trim();

/** The text of the first top-level paragraph that has any; else of the first list item; else of
 *  the first paragraph inside a blockquote. Headings, code, rules and tables are never quoted. */
function firstBlockText(tokens: Token[]): string {
  for (const t of tokens) {
    if (t.type !== "paragraph") continue;
    const text = squash(inlineText((t as Tokens.Paragraph).tokens));
    if (text) return text;
  }
  for (const t of tokens) {
    if (t.type !== "list") continue;
    for (const item of (t as Tokens.List).items) {
      const text = squash(inlineText(item.tokens));
      if (text) return text;
    }
  }
  for (const t of tokens) {
    if (t.type !== "blockquote") continue;
    const text = firstBlockText((t as Tokens.Blockquote).tokens);
    if (text) return text;
  }
  return "";
}

/** Cuts at the last space within `max` (a space exactly at `max` counts), drops trailing
 *  punctuation, and appends an ellipsis; a single word longer than `max` is hard-cut. */
function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const space = text.slice(0, max + 1).lastIndexOf(" ");
  let head = space > 0 ? text.slice(0, space).replace(/[\s.,;:!?\-\u2013\u2014]+$/, "") : "";
  if (head === "") {
    // Hard cut. Never leave half of a surrogate pair at the end.
    let end = max;
    const last = text.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    head = text.slice(0, end);
  }
  return head + ELLIPSIS;
}

/**
 * Markdown -> a one-paragraph plain-text excerpt for the Worlds panels. Server-side only (like
 * renderMarkdown): the client receives the excerpt, never the markdown. Never throws; an
 * unquotable or failing source gives "". A `max` that is not a positive finite number is the
 * default (160). The result is at most `max` characters plus the ellipsis.
 */
export function caseExcerpt(md: string, max: number = EXCERPT_MAX): string {
  if (typeof md !== "string" || !md.trim()) return "";
  const limit = Number.isFinite(max) && max >= 1 ? Math.floor(max) : EXCERPT_MAX;
  try {
    return cutAtWord(firstBlockText(marked.lexer(md)), limit);
  } catch (e) {
    // Same contract as renderMarkdown: log the failure (never the source), never throw.
    void appendLog("markdown", { level: "error", message: String(e) }).catch(() => {});
    return "";
  }
}
