"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import Image from "next/image";
import type { FieldSpec, FieldValue } from "@/lib/collections/fieldSpec";

interface FieldInputProps {
  name: string;
  spec: FieldSpec;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  uploadFile?: (file: File, type: "diagram") => Promise<string | null>;
  uploading?: boolean;
  error?: string;
}

/** Field types whose value is a length-capped string (drives the character counter). */
const COUNTED_TYPES = new Set<FieldSpec["type"]>(["text", "textarea", "markdown", "slug"]);

/**
 * globals.css styles .admin-field inputs/textareas but not <select> or number inputs;
 * these inline tokens keep those two native widgets on the dark admin palette without
 * editing the shared stylesheet (Task 10 may promote them to real CSS).
 */
const NATIVE_CONTROL_STYLE: CSSProperties = {
  background: "var(--primary)",
  border: "1px solid var(--border)",
  color: "var(--white)",
  colorScheme: "dark",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  padding: "0.7rem 0.9rem",
  outline: "none",
  width: "100%",
};

/** Keeps a slug field typeable: lowercase, spaces→hyphen, drop anything SLUG_RE rejects. */
function constrainSlug(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function FieldInput({ name, spec, value, onChange, uploadFile, uploading, error }: FieldInputProps) {
  const [chipDraft, setChipDraft] = useState("");
  // Non-null only while the number field is being edited, so the user can clear it
  // without a controlled `value` snapping back to the last committed number.
  const [numDraft, setNumDraft] = useState<string | null>(null);

  const id = `field-${name}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const str = typeof value === "string" ? value : "";

  const showCount = spec.max !== undefined && COUNTED_TYPES.has(spec.type);
  const count = showCount ? <div className="admin-char-count">{str.length} / {spec.max}</div> : null;

  // Screen readers get the help text and, when present, the validation error.
  const describedBy = [spec.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  // aria-required rather than the native `required` attr: native validation would fight
  // the parent form's own save/validate flow in Task 10.
  const a11y = {
    "aria-required": spec.required ? true : undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  const label = (
    <label htmlFor={id}>
      {spec.label}
      {spec.required && <span className="admin-required">*</span>}
    </label>
  );

  let control: ReactNode;
  switch (spec.type) {
    case "text":
      control = <input id={id} type="text" value={str} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} {...a11y} />;
      break;
    case "slug":
      control = (
        <input
          id={id}
          type="text"
          value={str}
          maxLength={spec.max}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          // Filter per keystroke instead of slugify(): slugify strips trailing hyphens,
          // which would swallow the hyphen the moment the user types it.
          onChange={(e) => onChange(constrainSlug(e.target.value))}
          {...a11y}
        />
      );
      break;
    case "number": {
      const committed = typeof value === "number" ? String(value) : "";
      control = (
        <input
          id={id}
          type="number"
          style={NATIVE_CONTROL_STYLE}
          value={numDraft ?? committed}
          max={spec.max}
          onChange={(e) => {
            const raw = e.target.value;
            setNumDraft(raw);
            const n = Number(raw);
            // Ignore "" and partial entries like "-" or "1e" — never emit NaN.
            if (raw.trim() !== "" && Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setNumDraft(null)}
          {...a11y}
        />
      );
      break;
    }
    case "textarea":
      control = <textarea id={id} rows={4} value={str} maxLength={spec.max} onChange={(e) => onChange(e.target.value)} {...a11y} />;
      break;
    case "markdown":
      // Plain monospace editor — src/lib/markdown.ts renders the authoritative HTML server-side.
      control = (
        <textarea
          id={id}
          rows={10}
          value={str}
          maxLength={spec.max}
          style={{ fontFamily: "var(--font-mono, ui-monospace), monospace", fontSize: "0.85rem", lineHeight: 1.6 }}
          onChange={(e) => onChange(e.target.value)}
          {...a11y}
        />
      );
      break;
    case "toggle": {
      const on = Boolean(value);
      // Native switch semantics: the outer <label htmlFor> names this button directly,
      // so no nested label/checkbox pair is needed.
      control = (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          className={`admin-btn admin-btn-sm ${on ? "admin-btn-primary" : "admin-btn-outline"}`}
          onClick={() => onChange(!on)}
          {...a11y}
        >
          {on ? "On" : "Off"}
        </button>
      );
      break;
    }
    case "select": {
      const options = spec.options ?? [];
      // Without a matching option the browser would display the first one while the model
      // still holds "", and validate() rejects "" with a confusing "must be one of".
      // A disabled placeholder keeps the visible state honest and forces a real pick.
      const unmatched = !options.some((o) => o.value === str);
      control = (
        <select id={id} style={NATIVE_CONTROL_STYLE} value={str} onChange={(e) => onChange(e.target.value)} {...a11y}>
          {unmatched && <option value={str} disabled>Select…</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    }
    case "chips": {
      const items = Array.isArray(value) ? value : [];
      const full = spec.maxItems !== undefined && items.length >= spec.maxItems;
      const add = () => {
        const t = chipDraft.trim();
        if (!t || full) return;
        onChange([...items, t.slice(0, spec.max ?? 200)]);
        setChipDraft("");
      };
      control = (
        <div className="admin-chips">
          {items.map((c, i) => (
            <span key={`${c}-${i}`} className="admin-chip">
              {c}
              <button
                type="button"
                className="admin-chip-remove"
                aria-label={`Remove ${c}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={id}
            className="admin-chip-input"
            type="text"
            value={chipDraft}
            maxLength={spec.max}
            placeholder={full ? "Max reached" : "Type and press Enter"}
            disabled={full}
            onChange={(e) => setChipDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter or comma commits the draft; backspace on an empty draft pops the last chip.
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              } else if (e.key === "Backspace" && chipDraft === "" && items.length > 0) {
                e.preventDefault();
                onChange(items.slice(0, -1));
              }
            }}
            onBlur={add}
            {...a11y}
          />
        </div>
      );
      break;
    }
    case "image":
      control = (
        <div className="admin-icon-upload">
          {str && <Image src={str} alt={spec.label} width={160} height={120} unoptimized style={{ objectFit: "contain" }} />}
          <input
            id={id}
            type="file"
            accept="image/*"
            // No uploader wired in → disable rather than silently swallowing the pick.
            disabled={!uploadFile || uploading}
            onChange={async (e) => {
              const input = e.target;
              const file = input.files?.[0];
              if (!file || !uploadFile) return;
              const path = await uploadFile(file, "diagram");
              // Clear so re-picking the same file fires change again.
              input.value = "";
              if (path) onChange(path);
            }}
            {...a11y}
          />
          {uploading && <span className="admin-uploading">Uploading...</span>}
          {str && (
            <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
      );
      break;
    default: {
      // All nine FieldType literals are handled; a new type breaks the build here.
      const _exhaustive: never = spec.type;
      void _exhaustive;
      control = null;
    }
  }

  return (
    <div className="admin-field">
      {label}
      {control}
      {spec.help && <div className="admin-field-hint" id={helpId}>{spec.help}</div>}
      {count}
      {error && <div className="admin-field-error" id={errorId}>{error}</div>}
    </div>
  );
}
