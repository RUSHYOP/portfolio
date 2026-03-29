"use client";

import { useState } from "react";
import type { Project } from "./types";
import { EMPTY_PROJECT } from "./types";

interface ProjectsTabProps {
  projects: Project[];
  uploading: boolean;
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio") => Promise<string | null>;
}

export default function ProjectsTab({ projects, uploading, toast, loadData, uploadFile }: ProjectsTabProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState<Omit<Project, "id" | "order">>(EMPTY_PROJECT);
  const [techInput, setTechInput] = useState("");

  const saveProject = async (project: Project) => {
    const res = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
    if (res.ok) { toast("Project saved"); setEditingProject(null); loadData(); } else toast("Failed to save project", true);
  };
  const createProject = async () => {
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newProject) });
    if (res.ok) { toast("Project created"); setAddingProject(false); setNewProject(EMPTY_PROJECT); setTechInput(""); loadData(); } else toast("Failed to create project", true);
  };
  const removeProject = async (id: string) => { if (!confirm("Delete this project?")) return; const res = await fetch(`/api/projects/${id}`, { method: "DELETE" }); if (res.ok) { toast("Project deleted"); loadData(); } else toast("Failed to delete", true); };

  return (
    <section>
      <div className="admin-section-header"><h2>Projects</h2><button className="admin-btn admin-btn-primary" onClick={() => setAddingProject(true)}>+ Add Project</button></div>

      {addingProject && (
        <div className="admin-card admin-form-card">
          <h3>New Project</h3>
          <ProjectForm project={newProject} techInput={techInput} onChange={(p) => setNewProject(p)} onTechChange={setTechInput} onUploadIcon={async (file) => { const path = await uploadFile(file, "project_icon"); if (path) setNewProject((prev) => ({ ...prev, icon: path })); }} uploading={uploading} />
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" onClick={createProject}>Create</button>
            <button className="admin-btn admin-btn-outline" onClick={() => { setAddingProject(false); setNewProject(EMPTY_PROJECT); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-projects-grid">
        {projects.map((project) =>
          editingProject?.id === project.id ? (
            <div key={project.id} className="admin-card admin-form-card">
              <h3>Edit Project</h3>
              <ProjectForm project={editingProject} techInput={editingProject.technologies.join(", ")} onChange={(p) => setEditingProject({ ...editingProject, ...p } as Project)} onTechChange={(v) => setEditingProject({ ...editingProject, technologies: v.split(",").map((t) => t.trim()).filter(Boolean) })} onUploadIcon={async (file) => { const path = await uploadFile(file, "project_icon"); if (path) setEditingProject((prev) => prev ? { ...prev, icon: path } : prev); }} uploading={uploading} />
              <div className="admin-form-actions">
                <button className="admin-btn admin-btn-primary" onClick={() => saveProject(editingProject)}>Save</button>
                <button className="admin-btn admin-btn-outline" onClick={() => setEditingProject(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={project.id} className="admin-card">
              <div className="admin-card-header"><div><h3>{project.title}</h3><p className="admin-card-desc">{project.description}</p></div></div>
              <div className="admin-card-meta">
                <div className="admin-tags">{project.technologies.map((t) => <span key={t} className="admin-tag">{t}</span>)}</div>
                <div className="admin-link-toggles">
                  {project.liveLink && <label className="admin-toggle-label"><input type="checkbox" checked={project.showLiveLink} onChange={async () => { await saveProject({ ...project, showLiveLink: !project.showLiveLink }); }} /><span>Live</span></label>}
                  {project.codeLink && <label className="admin-toggle-label"><input type="checkbox" checked={project.showCodeLink} onChange={async () => { await saveProject({ ...project, showCodeLink: !project.showCodeLink }); }} /><span>Code</span></label>}
                </div>
              </div>
              <div className="admin-card-actions">
                <button className="admin-btn admin-btn-sm" onClick={() => setEditingProject(project)}>Edit</button>
                <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => removeProject(project.id)}>Delete</button>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function ProjectForm({ project, techInput, onChange, onTechChange, onUploadIcon, uploading }: { project: Omit<Project, "id" | "order"> | Project; techInput: string; onChange: (p: Omit<Project, "id" | "order">) => void; onTechChange: (v: string) => void; onUploadIcon: (file: File) => void; uploading: boolean; }) {
  return (
    <div className="admin-project-form">
      <div className="admin-field"><label>Title</label><input type="text" value={project.title} onChange={(e) => onChange({ ...project, title: e.target.value })} placeholder="Project title" /></div>
      <div className="admin-field"><label>Description</label><textarea value={project.description} onChange={(e) => onChange({ ...project, description: e.target.value })} placeholder="Project description" rows={3} /></div>
      <div className="admin-field"><label>Technologies (comma-separated)</label><input type="text" value={techInput} onChange={(e) => { onTechChange(e.target.value); onChange({ ...project, technologies: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }); }} placeholder="Python, Flask, ML" /></div>
      <div className="admin-field-row">
        <div className="admin-field" style={{ flex: 1 }}><label>Live Link URL</label><input type="url" value={project.liveLink} onChange={(e) => onChange({ ...project, liveLink: e.target.value })} placeholder="https://..." /></div>
        <div className="admin-field" style={{ flex: 1 }}><label>Live Link Label</label><input type="text" value={project.liveLinkLabel} onChange={(e) => onChange({ ...project, liveLinkLabel: e.target.value })} placeholder="Live Demo" /></div>
      </div>
      <div className="admin-field"><label>Code Link URL</label><input type="url" value={project.codeLink} onChange={(e) => onChange({ ...project, codeLink: e.target.value })} placeholder="https://github.com/..." /></div>
      <div className="admin-field-row">
        <label className="admin-toggle-label"><input type="checkbox" checked={project.showLiveLink} onChange={(e) => onChange({ ...project, showLiveLink: e.target.checked })} /><span>Show Live Link</span></label>
        <label className="admin-toggle-label"><input type="checkbox" checked={project.showCodeLink} onChange={(e) => onChange({ ...project, showCodeLink: e.target.checked })} /><span>Show Code Link</span></label>
      </div>
    </div>
  );
}
