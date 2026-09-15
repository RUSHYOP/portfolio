"use client";

import { useEffect, useRef, useState } from "react";
import { labelFor } from "@/lib/collections/fieldSpec";
// Client-safe spec module (no Mongoose): option lists are plain data.
import { BUDGET_OPTIONS, TIMELINE_OPTIONS, STATUS_OPTIONS } from "@/lib/collections/specs/inquiries";
import { logClient } from "@/lib/clientLog";
import type { CollectionItem } from "./types";

interface Props {
  inquiries: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  /** True while the parent's first fetch is in flight — suppresses the empty state. */
  loading?: boolean;
}

/** One click walks the triage cycle; there is no other status transition in the UI. */
const NEXT_STATUS: Record<string, string> = { new: "replied", replied: "archived", archived: "new" };

type SendResult = { ok: true } | { ok: false; message: string };

export default function InboxTab({ inquiries, toast, loadData, loading }: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  // Blocks double-submits while a mutation and its refetch are in flight.
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The delete confirmation is a 5s window, not a modal; it also clears on unmount.
  useEffect(() => {
    if (!confirmDeleteId) return;
    timer.current = setTimeout(() => setConfirmDeleteId(null), 5000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [confirmDeleteId]);

  const rows = [...inquiries]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .filter((i) => filter === "all" || i.status === filter);

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
      logClient("admin.save_failed", { collection: "inquiries", verb, status: res.status, message });
      return { ok: false, message };
    } catch (e) {
      logClient("admin.save_failed", { collection: "inquiries", verb, message: String(e) });
      return { ok: false, message: "Network error — the change was not saved." };
    }
  };

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    const r = await send(`/api/inquiries/${id}`, "PUT", { status }, "status");
    if (r.ok) { toast(`Marked ${labelFor(STATUS_OPTIONS, status).toLowerCase()}`); await loadData(); }
    else toast(r.message, true);
    setBusy(false);
  };

  const remove = async (id: string) => {
    setConfirmDeleteId(null);
    setBusy(true);
    const r = await send(`/api/inquiries/${id}`, "DELETE", undefined, "delete");
    if (r.ok) { toast("Inquiry deleted"); await loadData(); }
    else toast(r.message, true);
    setBusy(false);
  };

  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast("Email copied");
    } catch {
      toast("Copy failed", true);
    }
  };

  return (
    <section>
      <div className="admin-section-header">
        <h2>Inbox</h2>
        {/* admin-native-control: without it the UA paints a light <select> on the dark page. */}
        <select
          className="admin-native-control"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading && inquiries.length === 0 && <p className="admin-hint">Loading inquiries...</p>}
      {!loading && rows.length === 0 && (
        <p className="admin-hint">No inquiries{filter !== "all" ? ` with status ${filter}` : ""} yet.</p>
      )}

      {rows.map((i) => {
        const next = NEXT_STATUS[String(i.status)] ?? "new";
        return (
          <div key={i.id} className="admin-card" style={{ marginBottom: "1rem" }}>
            <div className="admin-card-header">
              <strong>{String(i.name)}</strong>
              <span className="admin-tag">{labelFor(STATUS_OPTIONS, String(i.status))}</span>
              {Boolean(i.notifyFailed) && <span className="admin-tag" title="Email notification failed">notify failed</span>}
            </div>
            <div className="admin-card-meta">
              <span>{String(i.email)}</span> · <span>{labelFor(BUDGET_OPTIONS, String(i.budget))}</span> ·{" "}
              <span>{labelFor(TIMELINE_OPTIONS, String(i.timeline))}</span> · <span>{new Date(String(i.createdAt)).toLocaleString()}</span>
            </div>
            {/* Free text from the public form — preserve the submitter's line breaks. */}
            <p className="admin-card-desc" style={{ whiteSpace: "pre-wrap" }}>{String(i.building)}</p>
            <div className="admin-card-actions">
              <button className="admin-btn admin-btn-sm" onClick={() => copy(String(i.email))}>Copy email</button>
              <button className="admin-btn admin-btn-sm" disabled={busy} onClick={() => setStatus(i.id, next)}>
                Mark {labelFor(STATUS_OPTIONS, next).toLowerCase()}
              </button>
              {confirmDeleteId === i.id ? (
                <>
                  <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={busy} onClick={() => remove(i.id)}>Confirm?</button>
                  <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </>
              ) : (
                <button className="admin-btn admin-btn-sm admin-btn-danger" disabled={busy} onClick={() => setConfirmDeleteId(i.id)}>Delete</button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
