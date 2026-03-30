"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import type { Skill } from "./types";

interface SkillsTabProps {
  skills: Skill[];
  uploading: boolean;
  toast: (msg: string, error?: boolean, undo?: () => void) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio") => Promise<string | null>;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function SkillsTab({ skills, uploading, toast, loadData, uploadFile, onDirtyChange }: SkillsTabProps) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up confirm timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const markDirty = useCallback((dirty: boolean) => {
    onDirtyChange?.(dirty);
  }, [onDirtyChange]);

  const startEditing = (skill: Skill) => {
    setEditingSkill(skill);
    markDirty(true);
  };

  const cancelEditing = () => {
    setEditingSkill(null);
    markDirty(false);
  };

  const saveSkill = async (skill: Skill) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(skill),
      });
      if (res.ok) {
        toast("Skill saved");
        setEditingSkill(null);
        markDirty(false);
        loadData();
      } else {
        const d = await res.json().catch(() => null);
        toast(d?.error || "Failed to save skill", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const createSkill = async (name: string, icon: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon }),
      });
      if (res.ok) {
        toast("Skill added");
        setAddingSkill(false);
        setNewSkillName("");
        markDirty(false);
        loadData();
      } else {
        const d = await res.json().catch(() => null);
        toast(d?.error || "Failed to add skill", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const startDelete = (id: string) => {
    setConfirmingDeleteId(id);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmingDeleteId(null);
    }, 5000);
  };

  const cancelDelete = () => {
    setConfirmingDeleteId(null);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  };

  const removeSkill = async (id: string) => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmingDeleteId(null);
    const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Skill deleted");
      loadData();
    } else {
      const d = await res.json().catch(() => null);
      toast(d?.error || "Failed to delete skill", true);
    }
  };

  const swapOrder = async (skillA: Skill, skillB: Skill) => {
    setSaving(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/skills/${skillA.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...skillA, order: skillB.order }),
        }),
        fetch(`/api/skills/${skillB.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...skillB, order: skillA.order }),
        }),
      ]);
      if (resA.ok && resB.ok) {
        toast("Order updated");
        loadData();
      } else {
        toast("Failed to reorder skills", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...skills].sort((a, b) => a.order - b.order);
  const filtered = search
    ? sorted.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  return (
    <section>
      <div className="admin-section-header">
        <h2>Skills</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => { setAddingSkill(true); markDirty(true); }}>
          + Add Skill
        </button>
      </div>

      {skills.length > 0 && (
        <div className="admin-field" style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
          />
        </div>
      )}

      {addingSkill && (
        <div className="admin-card admin-form-card" style={{ marginBottom: "1.5rem" }}>
          <h3>New Skill</h3>
          <div className="admin-field">
            <label>Name <span style={{ color: "red" }}>*</span></label>
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Skill name"
            />
          </div>
          <div className="admin-field">
            <label>Icon</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !newSkillName.trim()) return;
                const path = await uploadFile(file, "skill_icon");
                if (path) await createSkill(newSkillName.trim(), path);
              }}
            />
            {uploading && <span className="admin-uploading">Uploading...</span>}
          </div>
          <div className="admin-form-actions">
            <button
              className="admin-btn admin-btn-primary"
              disabled={saving || !newSkillName.trim()}
              onClick={() => createSkill(newSkillName.trim(), "")}
            >
              {saving ? "Saving..." : "Add without icon"}
            </button>
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => { setAddingSkill(false); setNewSkillName(""); markDirty(false); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="admin-skills-list">
        {skills.length === 0 && !search && (
          <p style={{ color: "var(--admin-muted, #888)", padding: "1rem 0" }}>
            No skills yet. Click &apos;+ Add Skill&apos; to get started.
          </p>
        )}

        {skills.length > 0 && filtered.length === 0 && search && (
          <p style={{ color: "var(--admin-muted, #888)", padding: "1rem 0" }}>
            No skills match your search.
          </p>
        )}

        {filtered.map((skill, index) =>
          editingSkill?.id === skill.id ? (
            <div key={skill.id} className="admin-skill-row admin-skill-editing">
              <div className="admin-field" style={{ flex: 1 }}>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const path = await uploadFile(file, "skill_icon");
                    if (path) setEditingSkill({ ...editingSkill, icon: path });
                  }}
                />
              </div>
              <button
                className="admin-btn admin-btn-sm"
                disabled={saving || !editingSkill.name.trim()}
                onClick={() => saveSkill(editingSkill)}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          ) : (
            <div key={skill.id} className="admin-skill-row">
              <div className="admin-skill-info">
                {skill.icon && (
                  <Image src={skill.icon} alt={skill.name} width={32} height={32} className="admin-skill-icon" unoptimized />
                )}
                <span>{skill.name}</span>
              </div>
              <div className="admin-skill-actions">
                <button
                  className="admin-btn admin-btn-sm"
                  disabled={saving || index === 0}
                  onClick={() => swapOrder(filtered[index - 1], skill)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="admin-btn admin-btn-sm"
                  disabled={saving || index === filtered.length - 1}
                  onClick={() => swapOrder(skill, filtered[index + 1])}
                  title="Move down"
                >
                  ↓
                </button>
                <button className="admin-btn admin-btn-sm" onClick={() => startEditing(skill)}>
                  Edit
                </button>
                {confirmingDeleteId === skill.id ? (
                  <>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => removeSkill(skill.id)}
                    >
                      Confirm?
                    </button>
                    <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={cancelDelete}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="admin-btn admin-btn-sm admin-btn-danger"
                    onClick={() => startDelete(skill.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
