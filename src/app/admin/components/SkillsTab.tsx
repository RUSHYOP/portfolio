"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import type { Skill } from "./types";

interface SkillsTabProps {
  skills: Skill[];
  uploading: boolean;
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio") => Promise<string | null>;
}

export default function SkillsTab({ skills, uploading, toast, loadData, uploadFile }: SkillsTabProps) {
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const saveSkill = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(skill) });
    if (res.ok) { toast("Skill saved"); setEditingSkill(null); loadData(); } else toast("Failed to save skill", true);
  };
  const createSkill = async (name: string, icon: string) => {
    const res = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, icon }) });
    if (res.ok) { toast("Skill added"); setAddingSkill(false); setNewSkillName(""); loadData(); } else toast("Failed to add skill", true);
  };
  const removeSkill = async (id: string) => { if (!confirm("Delete this skill?")) return; const res = await fetch(`/api/skills/${id}`, { method: "DELETE" }); if (res.ok) { toast("Skill deleted"); loadData(); } else toast("Failed to delete", true); };

  return (
    <section>
      <div className="admin-section-header"><h2>Skills</h2><button className="admin-btn admin-btn-primary" onClick={() => setAddingSkill(true)}>+ Add Skill</button></div>
      {addingSkill && (
        <div className="admin-card admin-form-card" style={{ marginBottom: "1.5rem" }}>
          <h3>New Skill</h3>
          <div className="admin-field"><label>Name</label><input type="text" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="Skill name" /></div>
          <div className="admin-field"><label>Icon</label><input ref={fileRef} type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !newSkillName) return; const path = await uploadFile(file, "skill_icon"); if (path) await createSkill(newSkillName, path); }} />{uploading && <span className="admin-uploading">Uploading...</span>}</div>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={() => { if (newSkillName) createSkill(newSkillName, ""); }}>Add without icon</button>
            <button className="admin-btn admin-btn-outline" onClick={() => { setAddingSkill(false); setNewSkillName(""); }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="admin-skills-list">
        {skills.map((skill) =>
          editingSkill?.id === skill.id ? (
            <div key={skill.id} className="admin-skill-row admin-skill-editing">
              <div className="admin-field" style={{ flex: 1 }}><input type="text" value={editingSkill.name} onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })} /></div>
              <div className="admin-field"><input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, "skill_icon"); if (path) setEditingSkill({ ...editingSkill, icon: path }); }} /></div>
              <button className="admin-btn admin-btn-sm" onClick={() => saveSkill(editingSkill)}>Save</button>
              <button className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setEditingSkill(null)}>Cancel</button>
            </div>
          ) : (
            <div key={skill.id} className="admin-skill-row">
              <div className="admin-skill-info">{skill.icon && <Image src={skill.icon} alt={skill.name} width={32} height={32} className="admin-skill-icon" unoptimized />}<span>{skill.name}</span></div>
              <div className="admin-skill-actions">
                <button className="admin-btn admin-btn-sm" onClick={() => setEditingSkill(skill)}>Edit</button>
                <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => removeSkill(skill.id)}>Delete</button>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
