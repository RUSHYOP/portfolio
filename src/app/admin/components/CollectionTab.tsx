"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionDef, FieldValue } from "@/lib/collections/fieldSpec";
import type { CollectionItem, UploadType } from "./types";
import { logClient } from "@/lib/clientLog";
import FieldInput from "./FieldInput";
import { slugify } from "./slugify";

interface CollectionTabProps {
  def: CollectionDef;
  /** e.g. "/api/case-studies" */
  apiBase: string;
  title: string;
  /**
   * Singular form of `title`, for the editor heading and the mutation toasts —
   * "New service", not "New services". Falls back to `title` minus a trailing "s",
   * which is right for the simple plurals but not for e.g. "Case studies".
   */
  singular?: string;
  items: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: UploadType) => Promise<string | null>;
  uploading: boolean;
  /** True while the parent's first fetch is in flight — suppresses the empty state. */
  loading?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

type Form = Record<string, FieldValue>;

/** Every editable field at its spec default, so a create body is always complete. */
function emptyForm(def: CollectionDef): Form {
  const f: Form = {};
  for (const [k, s] of Object.entries(def.fields)) {
    if (s.internal) continue;
    f[k] = s.default ?? (s.type === "chips" ? [] : s.type === "toggle" ? false : s.type === "number" ? 0 : "");
  }
  return f;
}

/** Same shape as emptyForm, with the item's stored values layered on top. */
function formFromItem(def: CollectionDef, it: CollectionItem): Form {
  const f = emptyForm(def);
  for (const k of Object.keys(f)) if (it[k] !== undefined) f[k] = it[k];
  return f;
}

type SendResult = { ok: true } | { ok: false; status: number; message: string };

/**
 * Row labels are user content and the primary field is not always short — a testimonial's
 * is a 400-char quote. Clamp it so a row stays one line and a move button's accessible
 * name stays speakable; the untruncated text remains in the row's `title`.
 */
const MAX_LABEL = 60;
export function truncateLabel(s: string): string {
  return s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1).trimEnd()}…` : s;
}

export default function CollectionTab({
  def,
  apiBase,
  title,
  singular,
  items,
  toast,
  loadData,
  uploadFile,
  uploading,
  loading,
  onDirtyChange,
}: CollectionTabProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(() => emptyForm(def));
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Editor-scoped errors (a save attempt) vs list-scoped ones (delete/publish/reorder).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Spec-derived, not name-derived: the slug widget is identified by its type.
  const slugKey = useMemo(() => Object.entries(def.fields).find(([, s]) => s.type === "slug")?.[0], [def]);
  const hasTitle = Object.prototype.hasOwnProperty.call(def.fields, "title");
  const editable = useMemo(() => Object.entries(def.fields).filter(([, s]) => !s.internal), [def]);
  const primary = def.searchable[0] ?? Object.keys(def.fields)[0];
  const lower = title.toLowerCase();
  // One singular noun drives the editor heading and every mutation toast.
  const one = (singular ?? lower.replace(/s$/, "")).toLowerCase();
  // Toasts are sentences, so they capitalize it; headings read "New <noun>".
  const One = one.charAt(0).toUpperCase() + one.slice(1);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (def.orderable ? a.order - b.order : b.createdAt.localeCompare(a.createdAt))),
    [items, def.orderable],
  );
  // One predicate drives both the rendered list and whether reordering is allowed, so a
  // row index can never be read against a different list than the one it came from.
  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (query ? sorted.filter((it) => def.searchable.some((k) => String(it[k] ?? "").toLowerCase().includes(query))) : sorted),
    [sorted, query, def.searchable],
  );

  const editorOpen = adding || editingId !== null;
  useEffect(() => { onDirtyChange?.(editorOpen); }, [editorOpen, onDirtyChange]);

  // Opening the editor — or switching which row is open, which leaves `editorOpen` true —
  // moves focus to its first control so the form is typeable without reaching for the mouse.
  useEffect(() => {
    if (!adding && editingId === null) return;
    editorRef.current?.querySelector<HTMLElement>("input, textarea, select, button[role='switch']")?.focus();
  }, [adding, editingId]);

  // The delete confirmation is a 5s window, not a modal; it also clears on unmount.
  useEffect(() => {
    if (!confirmDeleteId) return;
    deleteTimer.current = setTimeout(() => setConfirmDeleteId(null), 5000);
    return () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); };
  }, [confirmDeleteId]);

  // ── form state ────────────────────────────────────────────────────────

  const clearErrors = () => { setFieldErrors({}); setFormError(null); };

  const setField = (k: string, v: FieldValue) => {
    // Side effects stay outside the updater — React may invoke it more than once.
    if (k === slugKey) setSlugTouched(true);
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const { [k]: _dropped, ...rest } = prev;
      return rest;
    });
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Auto-slug only while creating, and only until the user edits the slug by hand.
      if (adding && slugKey && hasTitle && k === "title" && !slugTouched) next[slugKey] = slugify(String(v));
      return next;
    });
  };

  const startAdd = () => {
    setForm(emptyForm(def));
    setSlugTouched(false);
    setEditingId(null);
    setAdding(true);
    clearErrors();
    setListError(null);
  };

  const startEdit = (it: CollectionItem) => {
    setForm(formFromItem(def, it));
    // An existing slug is the user's; never re-derive it from the title.
    setSlugTouched(true);
    setAdding(false);
    setEditingId(it.id);
    clearErrors();
    setListError(null);
  };

  const closeEditor = () => { setAdding(false); setEditingId(null); clearErrors(); };

  // ── requests ──────────────────────────────────────────────────────────

  /** One fetch wrapper: never throws, always logs a failure, always yields a message. */
  const send = async (url: string, method: string, body: unknown, verb: string): Promise<SendResult> => {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (res.ok) return { ok: true };
      const d = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const message = typeof d?.error === "string" ? d.error : `Request failed (${res.status})`;
      logClient("admin.save_failed", { collection: def.collection, verb, status: res.status, message });
      return { ok: false, status: res.status, message };
    } catch (e) {
      logClient("admin.save_failed", { collection: def.collection, verb, message: String(e) });
      return { ok: false, status: 0, message: "Network error — the change was not saved." };
    }
  };

  /** Refetch after every mutation: no optimistic local state to drift out of sync. */
  const refresh = async () => {
    try {
      await loadData();
    } catch (e) {
      logClient("admin.save_failed", { collection: def.collection, verb: "reload", message: String(e) });
      setListError("Saved, but the list could not be refreshed.");
    }
  };

  /**
   * Server validation errors carry the offending field name as the first word
   * (`${key} is required`, `${key} must be …`); a duplicate slug is a 409 that always
   * belongs on the slug field. Anything else is a form-level problem.
   */
  const applyError = (status: number, message: string) => {
    if (status === 409 && slugKey) { setFieldErrors({ [slugKey]: message }); setFormError(null); return; }
    const key = status === 400 ? Object.keys(def.fields).find((k) => message.startsWith(`${k} `)) : undefined;
    if (key) { setFieldErrors({ [key]: message }); setFormError(null); return; }
    setFieldErrors({});
    setFormError(message);
  };

  const submit = async () => {
    setSaving(true);
    clearErrors();
    const r = editingId
      ? await send(`${apiBase}/${editingId}`, "PUT", form, "update")
      : await send(apiBase, "POST", form, "create");
    if (r.ok) {
      toast(`${One} ${editingId ? "saved" : "created"}`);
      closeEditor();
      await refresh();
    } else {
      toast(r.message, true);
      applyError(r.status, r.message);
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    setListError(null);
    setSaving(true);
    const r = await send(`${apiBase}/${id}`, "DELETE", undefined, "delete");
    if (r.ok) { toast(`${One} deleted`); await refresh(); }
    else { toast(r.message, true); setListError(r.message); }
    setSaving(false);
  };

  const togglePublished = async (it: CollectionItem) => {
    setListError(null);
    setSaving(true);
    const next = !it.published;
    const r = await send(`${apiBase}/${it.id}`, "PUT", { published: next }, "publish");
    if (r.ok) { toast(next ? `${One} published` : `${One} unpublished`); await refresh(); }
    else { toast(r.message, true); setListError(r.message); }
    setSaving(false);
  };

  const move = async (it: CollectionItem, dir: -1 | 1) => {
    const ids = sorted.map((x) => x.id);
    const i = ids.indexOf(it.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setListError(null);
    setSaving(true);
    const r = await send(`${apiBase}/reorder`, "PUT", { ids: next }, "reorder");
    if (r.ok) { toast("Order updated"); await refresh(); }
    else { toast(r.message, true); setListError(r.message); }
    setSaving(false);
  };

  // ── render ────────────────────────────────────────────────────────────

  const editor = (submitLabel: string) => (
    <div
      className="admin-card admin-form-card"
      ref={editorRef}
      style={{ marginBottom: "1.5rem" }}
      // Scoped to the editor rather than window: the admin page already owns a global
      // Escape handler (it dismisses toasts).
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // An open native <select> popup swallows its own Escape, but the keydown still
        // reaches us in some browsers — closing the editor out from under the picker.
        // Escape from a focused select is therefore never a close.
        if (e.target instanceof HTMLSelectElement) return;
        e.stopPropagation();
        closeEditor();
      }}
    >
      <h3>{submitLabel === "Create" ? `New ${one}` : `Edit ${one}`}</h3>
      {formError && <div className="admin-field-error" role="alert">{formError}</div>}
      {editable.map(([k, s]) => (
        <FieldInput
          key={k}
          name={k}
          spec={s}
          value={form[k]}
          error={fieldErrors[k]}
          onChange={(v) => setField(k, v)}
          uploadFile={(f) => uploadFile(f, "diagram")}
          uploading={uploading}
        />
      ))}
      <div className="admin-form-actions">
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={submit}>
          {saving ? "Saving..." : submitLabel}
        </button>
        <button className="admin-btn admin-btn-outline" disabled={saving} onClick={closeEditor}>
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="admin-section-header">
        <h2>{title}</h2>
        {/* Disabled while a mutation is in flight — a refresh is about to replace the list. */}
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={startAdd}>+ Add</button>
      </div>

      {items.length > 0 && (
        <div className="admin-field" style={{ marginBottom: "1rem" }}>
          {/* Visually implicit but named for assistive tech — the placeholder is not a label. */}
          <input
            type="search"
            aria-label={`Search ${lower}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${lower}...`}
          />
        </div>
      )}

      {listError && <div className="admin-field-error" role="alert">{listError}</div>}

      {adding && editor("Create")}

      <div className="admin-skills-list">
        {loading && items.length === 0 && <p className="admin-hint">Loading {lower}...</p>}
        {!loading && items.length === 0 && !adding && (
          <p className="admin-hint">No {lower} yet. Click &quot;+ Add&quot; to create one.</p>
        )}
        {items.length > 0 && filtered.length === 0 && <p className="admin-hint">No {lower} match your search.</p>}

        {filtered.map((it, index) =>
          editingId === it.id ? (
            <div key={it.id}>{editor("Save")}</div>
          ) : (
            <div key={it.id} className="admin-skill-row">
              <div className="admin-skill-info">
                {/* Truncated for the row; the full value stays available as a tooltip. */}
                <span className="admin-collection-name" title={String(it[primary] ?? it.id)}>
                  {truncateLabel(String(it[primary] ?? it.id))}
                </span>
                {def.publishable && (
                  <span className="admin-tag" style={{ marginLeft: "0.5rem" }}>{it.published ? "Live" : "Draft"}</span>
                )}
              </div>
              <div className="admin-skill-actions">
                {def.orderable && (
                  <>
                    <button
                      className="admin-btn admin-btn-sm"
                      // Reordering is disabled while filtering: the visible index is not the stored one.
                      disabled={saving || index === 0 || query.length > 0}
                      aria-label={`Move ${truncateLabel(String(it[primary] ?? it.id))} up`}
                      title="Move up"
                      onClick={() => move(it, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      disabled={saving || index === filtered.length - 1 || query.length > 0}
                      aria-label={`Move ${truncateLabel(String(it[primary] ?? it.id))} down`}
                      title="Move down"
                      onClick={() => move(it, 1)}
                    >
                      ↓
                    </button>
                  </>
                )}
                {def.publishable && (
                  <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => togglePublished(it)}>
                    {it.published ? "Unpublish" : "Publish"}
                  </button>
                )}
                <button className="admin-btn admin-btn-sm" disabled={saving} onClick={() => startEdit(it)}>Edit</button>
                {confirmDeleteId === it.id ? (
                  <>
                    <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={saving} onClick={() => remove(it.id)}>
                      Confirm?
                    </button>
                    <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={saving} onClick={() => setConfirmDeleteId(it.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
