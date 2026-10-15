/** Title → URL slug matching SLUG_RE (lowercase, digits, single hyphens). */
export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      // Strip combining diacritics left behind by NFKD (é → e + U+0301).
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      // Cap first, then strip edges: slicing after stripping could re-expose a
      // boundary hyphen at char 80 and produce a value SLUG_RE rejects.
      .slice(0, 80)
      .replace(/^-+|-+$/g, "")
  );
}
