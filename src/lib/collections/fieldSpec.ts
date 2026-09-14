export type FieldType = "text" | "textarea" | "markdown" | "chips" | "image" | "toggle" | "select" | "slug" | "number";
export type FieldValue = string | number | boolean | string[];

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  type: FieldType;
  label: string;
  required?: boolean;
  /** Max string length (text/textarea/markdown/slug/chips items) or max numeric value. */
  max?: number;
  /** chips only */
  maxItems?: number;
  /** select only */
  options?: readonly SelectOption[];
  default?: FieldValue;
  help?: string;
  /** Server-managed: never accepted from a request body, stripped from public DTOs. */
  internal?: boolean;
}

export type FieldSpecs = Record<string, FieldSpec>;

export interface CollectionDef {
  /** Mongoose model name, e.g. "Service". */
  name: string;
  /** Mongo collection name, e.g. "services". */
  collection: string;
  idPrefix: string;
  fields: FieldSpecs;
  orderable: boolean;
  publishable: boolean;
  /** false → GET list requires admin auth (inquiries). */
  publicList: boolean;
  searchable: string[];
  revalidate: string[];
}

export type ValidationResult =
  | { ok: true; value: Record<string, FieldValue> }
  | { ok: false; error: string };

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_KEYS = ["id", "itemId", "order", "createdAt", "updatedAt", "_id"] as const;

const isPlainObject = (b: unknown): b is Record<string, unknown> =>
  typeof b === "object" && b !== null && !Array.isArray(b);

function checkString(key: string, spec: FieldSpec, raw: unknown): { value?: string; error?: string } {
  if (typeof raw !== "string") return { error: `${key} must be a string` };
  const value = raw.trim();
  if (spec.required && value.length === 0) return { error: `${key} is required` };
  if (spec.max !== undefined && value.length > spec.max) return { error: `${key} must be at most ${spec.max} characters` };
  if (spec.type === "slug" && value.length > 0 && !SLUG_RE.test(value)) {
    return { error: `${key} must be lowercase letters, numbers and single hyphens` };
  }
  return { value };
}

function checkField(key: string, spec: FieldSpec, raw: unknown): { value?: FieldValue; error?: string } {
  switch (spec.type) {
    case "text":
    case "textarea":
    case "markdown":
    case "slug":
    case "image":
      return checkString(key, spec, raw);
    case "chips": {
      if (!Array.isArray(raw) || !raw.every((t) => typeof t === "string")) return { error: `${key} must be an array of strings` };
      const items = (raw as string[]).map((t) => t.trim()).filter((t) => t.length > 0);
      if (spec.maxItems !== undefined && items.length > spec.maxItems) return { error: `${key} must have at most ${spec.maxItems} items` };
      // Hoisted so the closure keeps the narrowing — avoids a non-null assertion on spec.max.
      const max = spec.max;
      if (max !== undefined && items.some((t) => t.length > max)) return { error: `${key} items must be at most ${max} characters` };
      if (spec.required && items.length === 0) return { error: `${key} is required` };
      return { value: items };
    }
    case "toggle":
      if (typeof raw !== "boolean") return { error: `${key} must be a boolean` };
      return { value: raw };
    case "select": {
      if (typeof raw !== "string") return { error: `${key} must be a string` };
      const allowed = (spec.options ?? []).map((o) => o.value);
      if (!allowed.includes(raw)) return { error: `${key} must be one of: ${allowed.join(", ")}` };
      return { value: raw };
    }
    case "number":
      if (typeof raw !== "number" || !Number.isFinite(raw)) return { error: `${key} must be a number` };
      if (spec.max !== undefined && raw > spec.max) return { error: `${key} must be at most ${spec.max}` };
      return { value: raw };
    // Exhaustiveness is enforced here rather than by tsconfig: all nine literals are handled,
    // so spec.type is `never` below; adding a FieldType without a case breaks the build.
    default: {
      const _exhaustive: never = spec.type;
      void _exhaustive;
      return { error: `${key} has unsupported type` };
    }
  }
}

/**
 * Validates a request body against a field spec.
 * create: enforces required, applies defaults for absent fields.
 * update: validates only present keys.
 * Reserved and internal keys are always rejected.
 * A `required` field is never satisfied by its `default`; defaults apply only to optional fields.
 */
export function validate(fields: FieldSpecs, body: unknown, mode: "create" | "update"): ValidationResult {
  if (!isPlainObject(body)) return { ok: false, error: "Body must be a JSON object" };

  for (const key of Object.keys(body)) {
    if ((RESERVED_KEYS as readonly string[]).includes(key)) return { ok: false, error: `${key} cannot be set` };
    // Own-property lookup only: `fields[key]` would resolve prototype-chain keys
    // (__proto__, constructor, toString), letting them pass as "known" and be silently dropped.
    const spec = Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
    if (!spec) return { ok: false, error: `unknown field: ${key}` };
    if (spec.internal) return { ok: false, error: `${key} cannot be set` };
  }

  const value: Record<string, FieldValue> = {};
  for (const [key, spec] of Object.entries(fields)) {
    if (spec.internal) continue;
    const present = Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
    if (!present) {
      if (mode === "create") {
        if (spec.required) return { ok: false, error: `${key} is required` };
        if (spec.default !== undefined) value[key] = spec.default;
      }
      continue;
    }
    const checked = checkField(key, spec, body[key]);
    if (checked.error) return { ok: false, error: checked.error };
    if (checked.value !== undefined) value[key] = checked.value;
  }
  return { ok: true, value };
}

export function labelFor(options: readonly SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
