"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface Project {
  id: string;
  title: string;
  description: string;
  icon: string;
  technologies: string[];
  liveLink: string;
  liveLinkLabel: string;
  codeLink: string;
  showLiveLink: boolean;
  showCodeLink: boolean;
  order: number;
}

interface Skill {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface Settings {
  profileImage: string;
  audioFile: string;
}

type Tab = "projects" | "skills" | "media";

const EMPTY_PROJECT: Omit<Project, "id" | "order"> = {
  title: "",
  description: "",
  icon: "",
  technologies: [],
  liveLink: "",
  liveLinkLabel: "",
  codeLink: "",
  showLiveLink: false,
  showCodeLink: true,
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [settings, setSettings] = useState<Settings>({ profileImage: "", audioFile: "" });

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState(EMPTY_PROJECT);
  const [techInput, setTechInput] = useState("");

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  // Check auth on load
  useEffect(() => {
    fetch("/api/auth/verify")
      .then((r) => {
        if (r.ok) setAuthenticated(true);
      })
      .finally(() => setChecking(false));
  }, []);

  // Load data when authenticated
  const loadData = useCallback(async () => {
    if (!authenticated) return;
    const [pRes, sRes, setRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/skills"),
      fetch("/api/settings"),
    ]);
    if (pRes.ok) setProjects(await pRes.json());
    if (sRes.ok) setSkills(await sRes.json());
    if (setRes.ok) setSettings(await setRes.json());
  }, [authenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const flash = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  // --- Auth ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  };

  // --- Upload helper ---
  const uploadFile = async (
    file: File,
    type: "profile" | "project_icon" | "skill_icon" | "audio"
  ): Promise<string | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        flash(`Upload failed: ${err.error}`);
        return null;
      }
      const data = await res.json();
      return data.path;
    } catch {
      flash("Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // --- Projects ---
  const saveProject = async (project: Project) => {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      flash("Project saved");
      setEditingProject(null);
      loadData();
    } else flash("Failed to save project");
  };

  const createProject = async () => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProject),
    });
    if (res.ok) {
      flash("Project created");
      setAddingProject(false);
      setNewProject(EMPTY_PROJECT);
      setTechInput("");
      loadData();
    } else flash("Failed to create project");
  };

  const removeProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Project deleted");
      loadData();
    } else flash("Failed to delete");
  };

  // --- Skills ---
  const saveSkill = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skill),
    });
    if (res.ok) {
      flash("Skill saved");
      setEditingSkill(null);
      loadData();
    } else flash("Failed to save skill");
  };

  const createSkill = async (name: string, icon: string) => {
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon }),
    });
    if (res.ok) {
      flash("Skill added");
      setAddingSkill(false);
      setNewSkillName("");
      loadData();
    } else flash("Failed to add skill");
  };

  const removeSkill = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Skill deleted");
      loadData();
    } else flash("Failed to delete");
  };

  // --- Settings ---
  const updateSettingsField = async (field: string, value: string) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      flash("Settings updated");
      loadData();
    } else flash("Failed to update");
  };

  // --- Render ---
  if (checking) {
    return (
      <div className="admin-loading">
        <div className="loader"></div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-login-wrapper">
        <form className="admin-login-form" onSubmit={handleLogin}>
          <h1 className="admin-login-title">Admin Login</h1>
          {loginError && <div className="admin-error">{loginError}</div>}
          <div className="admin-field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              name="portfolio-admin-email"
              autoFocus
            />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              name="portfolio-admin-password"
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={loginLoading}>
            {loginLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      <header className="admin-header">
        <h1>Portfolio Admin</h1>
        <div className="admin-header-actions">
          {saveMsg && <span className="admin-flash">{saveMsg}</span>}
          <button onClick={handleLogout} className="admin-btn admin-btn-outline">
            Logout
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {(["projects", "skills", "media"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`admin-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {/* ===== PROJECTS TAB ===== */}
        {tab === "projects" && (
          <section>
            <div className="admin-section-header">
              <h2>Projects</h2>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => setAddingProject(true)}
              >
                + Add Project
              </button>
            </div>

            {addingProject && (
              <div className="admin-card admin-form-card">
                <h3>New Project</h3>
                <ProjectForm
                  project={newProject}
                  techInput={techInput}
                  onChange={(p) => setNewProject(p)}
                  onTechChange={setTechInput}
                  onUploadIcon={async (file) => {
                    const path = await uploadFile(file, "project_icon");
                    if (path) setNewProject({ ...newProject, icon: path });
                  }}
                  uploading={uploading}
                />
                <div className="admin-form-actions">
                  <button className="admin-btn admin-btn-primary" onClick={createProject}>
                    Create
                  </button>
                  <button
                    className="admin-btn admin-btn-outline"
                    onClick={() => {
                      setAddingProject(false);
                      setNewProject(EMPTY_PROJECT);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="admin-projects-grid">
              {projects.map((project) =>
                editingProject?.id === project.id ? (
                  <div key={project.id} className="admin-card admin-form-card">
                    <h3>Edit Project</h3>
                    <ProjectForm
                      project={editingProject}
                      techInput={editingProject.technologies.join(", ")}
                      onChange={(p) =>
                        setEditingProject({ ...editingProject, ...p } as Project)
                      }
                      onTechChange={(v) =>
                        setEditingProject({
                          ...editingProject,
                          technologies: v.split(",").map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      onUploadIcon={async (file) => {
                        const path = await uploadFile(file, "project_icon");
                        if (path) setEditingProject({ ...editingProject, icon: path });
                      }}
                      uploading={uploading}
                    />
                    <div className="admin-form-actions">
                      <button
                        className="admin-btn admin-btn-primary"
                        onClick={() => saveProject(editingProject)}
                      >
                        Save
                      </button>
                      <button
                        className="admin-btn admin-btn-outline"
                        onClick={() => setEditingProject(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={project.id} className="admin-card">
                    <div className="admin-card-header">
                      {project.icon ? (
                        <Image
                          src={project.icon}
                          alt={project.title}
                          width={48}
                          height={48}
                          className="admin-card-icon"
                          unoptimized
                        />
                      ) : (
                        <div className="admin-no-icon">No Icon</div>
                      )}
                      <div>
                        <h3>{project.title}</h3>
                        <p className="admin-card-desc">{project.description}</p>
                        {project.icon && <small style={{ color: '#666', fontSize: '0.75rem' }}>Icon: {project.icon}</small>}
                      </div>
                    </div>
                    <div className="admin-card-meta">
                      <div className="admin-tags">
                        {project.technologies.map((t) => (
                          <span key={t} className="admin-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="admin-link-toggles">
                        {project.liveLink && (
                          <label className="admin-toggle-label">
                            <input
                              type="checkbox"
                              checked={project.showLiveLink}
                              onChange={async () => {
                                const updated = { ...project, showLiveLink: !project.showLiveLink };
                                await saveProject(updated);
                              }}
                            />
                            <span>Live Link</span>
                          </label>
                        )}
                        {project.codeLink && (
                          <label className="admin-toggle-label">
                            <input
                              type="checkbox"
                              checked={project.showCodeLink}
                              onChange={async () => {
                                const updated = { ...project, showCodeLink: !project.showCodeLink };
                                await saveProject(updated);
                              }}
                            />
                            <span>Code Link</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="admin-card-actions">
                      <button
                        className="admin-btn admin-btn-sm"
                        onClick={() => setEditingProject(project)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => removeProject(project.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ===== SKILLS TAB ===== */}
        {tab === "skills" && (
          <section>
            <div className="admin-section-header">
              <h2>Skills</h2>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => setAddingSkill(true)}
              >
                + Add Skill
              </button>
            </div>

            {addingSkill && (
              <div className="admin-card admin-form-card" style={{ marginBottom: "1.5rem" }}>
                <h3>New Skill</h3>
                <div className="admin-field">
                  <label>Name</label>
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
                      if (!file || !newSkillName) return;
                      const path = await uploadFile(file, "skill_icon");
                      if (path) {
                        await createSkill(newSkillName, path);
                      }
                    }}
                  />
                  {uploading && <span className="admin-uploading">Uploading...</span>}
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      if (newSkillName) createSkill(newSkillName, "");
                    }}
                  >
                    Add without icon
                  </button>
                  <button
                    className="admin-btn admin-btn-outline"
                    onClick={() => {
                      setAddingSkill(false);
                      setNewSkillName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="admin-skills-list">
              {skills.map((skill) =>
                editingSkill?.id === skill.id ? (
                  <div key={skill.id} className="admin-skill-row admin-skill-editing">
                    <div className="admin-field" style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={editingSkill.name}
                        onChange={(e) =>
                          setEditingSkill({ ...editingSkill, name: e.target.value })
                        }
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
                      onClick={() => saveSkill(editingSkill)}
                    >
                      Save
                    </button>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-outline"
                      onClick={() => setEditingSkill(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div key={skill.id} className="admin-skill-row">
                    <div className="admin-skill-info">
                      {skill.icon && (
                        <Image
                          src={skill.icon}
                          alt={skill.name}
                          width={32}
                          height={32}
                          className="admin-skill-icon"
                        />
                      )}
                      <span>{skill.name}</span>
                    </div>
                    <div className="admin-skill-actions">
                      <button
                        className="admin-btn admin-btn-sm"
                        onClick={() => setEditingSkill(skill)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => removeSkill(skill.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* ===== MEDIA TAB ===== */}
        {tab === "media" && (
          <section>
            <h2>Media & Settings</h2>

            <div className="admin-media-grid">
              <div className="admin-card">
                <h3>Profile Image</h3>
                <p className="admin-hint">Max 800x800px, 2MB. Formats: jpg, png, webp</p>
                {settings.profileImage && (
                  <div className="admin-media-preview">
                    <Image
                      src={settings.profileImage}
                      alt="Profile"
                      width={200}
                      height={200}
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const path = await uploadFile(file, "profile");
                    if (path) await updateSettingsField("profileImage", path);
                  }}
                />
                {uploading && <span className="admin-uploading">Uploading...</span>}
              </div>

              <div className="admin-card">
                <h3>Background Audio</h3>
                <p className="admin-hint">Max 10MB. Formats: mp3, ogg, wav</p>
                {settings.audioFile && (
                  <div className="admin-media-preview">
                    <audio controls src={settings.audioFile} style={{ width: "100%" }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="audio/mpeg,audio/ogg,audio/wav"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const path = await uploadFile(file, "audio");
                    if (path) await updateSettingsField("audioFile", path);
                  }}
                />
                {uploading && <span className="admin-uploading">Uploading...</span>}
              </div>
            </div>

            <div className="admin-card" style={{ marginTop: "1.5rem" }}>
              <h3>Image Size Limits</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Max Resolution</th>
                    <th>Max Size</th>
                    <th>Formats</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Profile Image</td>
                    <td>800 x 800</td>
                    <td>2 MB</td>
                    <td>jpg, png, webp</td>
                  </tr>
                  <tr>
                    <td>Project Icon</td>
                    <td>256 x 256</td>
                    <td>512 KB</td>
                    <td>jpg, png, webp, svg</td>
                  </tr>
                  <tr>
                    <td>Skill Icon</td>
                    <td>128 x 128</td>
                    <td>200 KB</td>
                    <td>jpg, png, webp, svg</td>
                  </tr>
                  <tr>
                    <td>Audio</td>
                    <td>N/A</td>
                    <td>10 MB</td>
                    <td>mp3, ogg, wav</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// --- Sub-component: Project Form ---
function ProjectForm({
  project,
  techInput,
  onChange,
  onTechChange,
  onUploadIcon,
  uploading,
}: {
  project: Omit<Project, "id" | "order"> | Project;
  techInput: string;
  onChange: (p: Omit<Project, "id" | "order">) => void;
  onTechChange: (v: string) => void;
  onUploadIcon: (file: File) => void;
  uploading: boolean;
}) {
  return (
    <div className="admin-project-form">
      <div className="admin-field">
        <label>Title</label>
        <input
          type="text"
          value={project.title}
          onChange={(e) => onChange({ ...project, title: e.target.value })}
          placeholder="Project title"
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
        <label>Icon</label>
        <div className="admin-icon-upload">
          {project.icon && (
            <Image
              src={project.icon}
              alt="Icon"
              width={48}
              height={48}
              className="admin-card-icon"
              unoptimized
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadIcon(file);
            }}
          />
          {uploading && <span className="admin-uploading">Uploading...</span>}
          {project.icon && <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>{project.icon}</small>}
        </div>
      </div>
      <div className="admin-field">
        <label>Technologies (comma-separated)</label>
        <input
          type="text"
          value={techInput}
          onChange={(e) => {
            onTechChange(e.target.value);
            onChange({
              ...project,
              technologies: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            });
          }}
          placeholder="Python, Flask, ML"
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
