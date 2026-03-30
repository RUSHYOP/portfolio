"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Project } from "./types";
import { EMPTY_PROJECT } from "./types";

interface ProjectsTabProps {
  projects: Project[];
  uploading: boolean;
  toast: (msg: string, error?: boolean, undo?: () => void) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio") => Promise<string | null>;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function ProjectsTab({ projects, uploading, toast, loadData, uploadFile, onDirtyChange }: ProjectsTabProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<Omit<Project, "id" | "order">>(EMPTY_PROJECT);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent of dirty state
  const markDirty = useCallback((dirty: boolean) => {
    onDirtyChange?.(dirty);
  }, [onDirtyChange]);

  useEffect(() => {
    markDirty(editingProject !== null || addingProject);
  }, [editingProject, addingProject, markDirty]);

  // Auto-revert delete confirmation after 5 seconds
  useEffect(() => {
    if (confirmingDeleteId) {
      deleteTimerRef.current = setTimeout(() => setConfirmingDeleteId(null), 5000);
      return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); };
    }
  }, [confirmingDeleteId]);

  const sorted = [...projects].sort((a, b) => a.order - b.order);

  const filtered = search.trim()
    ? sorted.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q))
        );
      })
    : sorted;

  const saveProject = async (project: Project) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      if (res.ok) {
        toast("Project saved");
        setEditingProject(null);
        markDirty(false);
        loadData();
      } else {
        const d = await res.json().catch(() => null);
        toast(d?.error || "Failed to save project", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const createProject = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        toast("Project created");
        setAddingProject(false);
        setNewProject(EMPTY_PROJECT);
        markDirty(false);
        loadData();
      } else {
        const d = await res.json().catch(() => null);
        toast(d?.error || "Failed to create project", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const removeProject = async (id: string) => {
    setConfirmingDeleteId(null);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Project deleted");
      loadData();
    } else {
      const d = await res.json().catch(() => null);
      toast(d?.error || "Failed to delete project", true);
    }
  };

  const swapOrder = async (indexA: number, indexB: number) => {
    const a = sorted[indexA];
    const b = sorted[indexB];
    if (!a || !b) return;
    setSaving(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/projects/${a.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...a, order: b.order }),
        }),
        fetch(`/api/projects/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...b, order: a.order }),
        }),
      ]);
      if (resA.ok && resB.ok) {
        toast("Order updated");
        loadData();
      } else {
        toast("Failed to reorder projects", true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setAddingProject(false);
    setNewProject(EMPTY_PROJECT);
    markDirty(false);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    markDirty(false);
  };

  return (
    <section>
      <div className="admin-section-header">
        <h2>Projects</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => setAddingProject(true)}>
          + Add Project
        </button>
      </div>

      {/* Search */}
      {(projects.length > 0 || search) && (
        <div className="admin-search-bar" style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search projects by title, description, or technology…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* New project form */}
      {addingProject && (
        <div className="admin-card admin-form-card">
          <h3>New Project</h3>
          <ProjectForm
            project={newProject}
            onChange={(p) => setNewProject(p)}
            onUploadIcon={async (file) => {
              const path = await uploadFile(file, "project_icon");
              if (path) setNewProject((prev) => ({ ...prev, icon: path }));
            }}
            uploading={uploading}
          />
          <div className="admin-form-actions">
            <button
              className="admin-btn admin-btn-primary"
              disabled={saving || !newProject.title.trim()}
              onClick={createProject}
            >
              {saving ? "Saving..." : "Create"}
            </button>
            <button className="admin-btn admin-btn-outline" onClick={handleCancelAdd}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !search && !addingProject && (
        <div className="admin-empty-state" style={{ textAlign: "center", padding: "3rem 1rem", opacity: 0.7 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
          <p>No projects yet. Click &quot;+ Add Project&quot; to get started.</p>
        </div>
      )}

      {/* No search results */}
      {projects.length > 0 && filtered.length === 0 && search.trim() && (
        <div className="admin-empty-state" style={{ textAlign: "center", padding: "2rem 1rem", opacity: 0.7 }}>
          <p>No projects match &quot;{search}&quot;</p>
        </div>
      )}

      {/* Project list */}
      <div className="admin-projects-grid">
        {filtered.map((project, idx) => {
          const sortedIndex = sorted.findIndex((p) => p.id === project.id);
          const isFirst = sortedIndex === 0;
          const isLast = sortedIndex === sorted.length - 1;

          if (editingProject?.id === project.id) {
            return (
              <div key={project.id} className="admin-card admin-form-card">
                <h3>Edit Project</h3>
                <ProjectForm
                  project={editingProject}
                  onChange={(p) => setEditingProject({ ...editingProject, ...p } as Project)}
                  onUploadIcon={async (file) => {
                    const path = await uploadFile(file, "project_icon");
                    if (path) setEditingProject((prev) => (prev ? { ...prev, icon: path } : prev));
                  }}
                  uploading={uploading}
                />
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-primary"
                    disabled={saving || !editingProject.title.trim()}
                    onClick={() => saveProject(editingProject)}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button className="admin-btn admin-btn-outline" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={project.id} className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>{project.title}</h3>
                  <p className="admin-card-desc">{project.description}</p>
                </div>
              </div>
              <div className="admin-card-meta">
                <div className="admin-tags">
                  {project.technologies.map((t) => (
                    <span key={t} className="admin-tag">{t}</span>
                  ))}
                </div>
                <div className="admin-link-toggles">
                  {project.liveLink && (
                    <label className="admin-toggle-label">
                      <input
                        type="checkbox"
                        checked={project.showLiveLink}
                        onChange={async () => {
                          await saveProject({ ...project, showLiveLink: !project.showLiveLink });
                        }}
                      />
                      <span>Live</span>
                    </label>
                  )}
                  {project.codeLink && (
                    <label className="admin-toggle-label">
                      <input
                        type="checkbox"
                        checked={project.showCodeLink}
                        onChange={async () => {
                          await saveProject({ ...project, showCodeLink: !project.showCodeLink });
                        }}
                      />
                      <span>Code</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="admin-card-actions">
                {/* Reorder buttons — hidden when search is active */}
                {!search.trim() && (
                  <div className="admin-reorder-btns" style={{ display: "inline-flex", gap: "0.25rem", marginRight: "auto" }}>
                    <button
                      className="admin-btn admin-btn-sm"
                      disabled={isFirst || saving}
                      onClick={() => swapOrder(sortedIndex, sortedIndex - 1)}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      className="admin-btn admin-btn-sm"
                      disabled={isLast || saving}
                      onClick={() => swapOrder(sortedIndex, sortedIndex + 1)}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                )}
                <button className="admin-btn admin-btn-sm" onClick={() => setEditingProject(project)}>
                  Edit
                </button>
                {confirmingDeleteId === project.id ? (
                  <>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-danger"
                      onClick={() => removeProject(project.id)}
                    >
                      Confirm Delete
                    </button>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-outline"
                      onClick={() => setConfirmingDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="admin-btn admin-btn-sm admin-btn-danger"
                    onClick={() => setConfirmingDeleteId(project.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Tech Chips Input ─── */

function TechChipsInput({
  technologies,
  onChange,
}: {
  technologies: string[];
  onChange: (techs: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !technologies.includes(trimmed)) {
      onChange([...technologies, trimmed]);
    }
    setInput("");
  };

  const removeChip = (tech: string) => {
    onChange(technologies.filter((t) => t !== tech));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addChip(input);
    } else if (e.key === "Backspace" && !input && technologies.length > 0) {
      removeChip(technologies[technologies.length - 1]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If user pastes or types a comma, split and add chips
    if (val.includes(",")) {
      const parts = val.split(",");
      parts.forEach((part, i) => {
        if (i < parts.length - 1) addChip(part);
      });
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val);
    }
  };

  return (
    <div
      className="admin-chips-input"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.35rem",
        padding: "0.35rem 0.5rem",
        border: "1px solid var(--admin-border, #333)",
        borderRadius: "0.375rem",
        background: "var(--admin-input-bg, #1a1a2e)",
        cursor: "text",
        minHeight: "2.5rem",
        alignItems: "center",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {technologies.map((tech) => (
        <span
          key={tech}
          className="admin-tag"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
        >
          {tech}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeChip(tech); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              lineHeight: 1,
              fontSize: "0.85em",
              color: "inherit",
              opacity: 0.7,
            }}
            aria-label={`Remove ${tech}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addChip(input); }}
        placeholder={technologies.length === 0 ? "Type and press Enter…" : ""}
        style={{
          flex: 1,
          minWidth: "80px",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "inherit",
          fontSize: "inherit",
          padding: "0.15rem 0",
        }}
      />
    </div>
  );
}

/* ─── Project Form ─── */

function ProjectForm({
  project,
  onChange,
  onUploadIcon,
  uploading,
}: {
  project: Omit<Project, "id" | "order"> | Project;
  onChange: (p: Omit<Project, "id" | "order">) => void;
  onUploadIcon: (file: File) => void;
  uploading: boolean;
}) {
  return (
    <div className="admin-project-form">
      <div className="admin-field">
        <label>
          Title <span style={{ color: "var(--admin-danger, #e74c3c)" }}>*</span>
        </label>
        <input
          type="text"
          value={project.title}
          onChange={(e) => onChange({ ...project, title: e.target.value })}
          placeholder="Project title"
          required
        />
      </div>
      <div className="admin-field">
        <label>Description</label>
        <textarea
          value={project.description}
          onChange={(e) => onChange({ ...project, description: e.target.value })}
          placeholder="Project description"
          rows={3}
        />
      </div>
      <div className="admin-field">
        <label>Technologies</label>
        <TechChipsInput
          technologies={project.technologies}
          onChange={(techs) => onChange({ ...project, technologies: techs })}
        />
      </div>
      <div className="admin-field-row">
        <div className="admin-field" style={{ flex: 1 }}>
          <label>Live Link URL</label>
          <input
            type="url"
            value={project.liveLink}
            onChange={(e) => onChange({ ...project, liveLink: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="admin-field" style={{ flex: 1 }}>
          <label>Live Link Label</label>
          <input
            type="text"
            value={project.liveLinkLabel}
            onChange={(e) => onChange({ ...project, liveLinkLabel: e.target.value })}
            placeholder="Live Demo"
          />
        </div>
      </div>
      <div className="admin-field">
        <label>Code Link URL</label>
        <input
          type="url"
          value={project.codeLink}
          onChange={(e) => onChange({ ...project, codeLink: e.target.value })}
          placeholder="https://github.com/..."
        />
      </div>
      <div className="admin-field-row">
        <label className="admin-toggle-label">
          <input
            type="checkbox"
            checked={project.showLiveLink}
            onChange={(e) => onChange({ ...project, showLiveLink: e.target.checked })}
          />
          <span>Show Live Link</span>
        </label>
        <label className="admin-toggle-label">
          <input
            type="checkbox"
            checked={project.showCodeLink}
            onChange={(e) => onChange({ ...project, showCodeLink: e.target.checked })}
          />
          <span>Show Code Link</span>
        </label>
      </div>
    </div>
  );
}
