"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface MediaFile { id: string; filename: string; size: number; uploadedAt: string; contentType: string; uploadType: string; url: string; }
interface Project { id: string; title: string; description: string; icon: string; technologies: string[]; liveLink: string; liveLinkLabel: string; codeLink: string; showLiveLink: boolean; showCodeLink: boolean; order: number; }
interface Skill { id: string; name: string; icon: string; order: number; }
interface NavLink { label: string; href: string; }
interface FooterSection { title: string; links: { label: string; url: string }[]; }
interface Settings {
  profileImage: string; audioFile: string; aboutHeading: string; aboutText: string;
  quote1: string; quote2: string; projectsTitle: string;
  contactHeading: string; contactText: string; contactEmail: string; contactLocation: string;
  showNavbar: boolean; navLinks: NavLink[]; footerSections: FooterSection[];
}

type Tab = "content" | "projects" | "skills" | "navigation" | "media";

const EMPTY_PROJECT: Omit<Project, "id" | "order"> = { title: "", description: "", icon: "", technologies: [], liveLink: "", liveLinkLabel: "", codeLink: "", showLiveLink: false, showCodeLink: true };

const DEFAULT_SETTINGS: Settings = {
  profileImage: "", audioFile: "", aboutHeading: "", aboutText: "",
  quote1: "", quote2: "", projectsTitle: "SOME OF THE THINGS I'VE BUILT",
  contactHeading: "", contactText: "", contactEmail: "", contactLocation: "",
  showNavbar: true, navLinks: [], footerSections: [],
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState<Tab>("content");
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Local form states
  const [contentForm, setContentForm] = useState({ aboutHeading: "", aboutText: "", quote1: "", quote2: "", projectsTitle: "", contactHeading: "", contactText: "", contactEmail: "", contactLocation: "" });
  const [navForm, setNavForm] = useState<{ showNavbar: boolean; navLinks: NavLink[] }>({ showNavbar: true, navLinks: [] });
  const [footerForm, setFooterForm] = useState<FooterSection[]>([]);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState(EMPTY_PROJECT);
  const [techInput, setTechInput] = useState("");

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; error?: boolean }[]>([]);
  const toastId = useRef(0);

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string) => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((msg: string, error = false) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, error }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => { fetch("/api/auth/verify").then((r) => { if (r.ok) setAuthenticated(true); }).finally(() => setChecking(false)); }, []);

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    const [pRes, sRes, setRes] = await Promise.all([fetch("/api/projects"), fetch("/api/skills"), fetch("/api/settings")]);
    if (pRes.ok) setProjects(await pRes.json());
    if (sRes.ok) setSkills(await sRes.json());
    if (setRes.ok) {
      const s: Settings = await setRes.json();
      setSettings(s);
      setContentForm({ aboutHeading: s.aboutHeading || "", aboutText: s.aboutText || "", quote1: s.quote1 || "", quote2: s.quote2 || "", projectsTitle: s.projectsTitle || "", contactHeading: s.contactHeading || "", contactText: s.contactText || "", contactEmail: s.contactEmail || "", contactLocation: s.contactLocation || "" });
      setNavForm({ showNavbar: s.showNavbar ?? true, navLinks: s.navLinks || [] });
      setFooterForm(s.footerSections || []);
    }
  }, [authenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const openMediaPicker = async (type: string, callback: (url: string) => void) => {
    setMediaPickerCallback(() => callback);
    setShowMediaPicker(true);
    try { const res = await fetch(`/api/media?type=${type}`); if (res.ok) setMediaFiles(await res.json()); } catch { toast("Failed to load media library", true); }
  };
  const selectMedia = (url: string) => { mediaPickerCallback?.(url); setShowMediaPicker(false); setMediaFiles([]); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginLoading(true); setLoginError("");
    try { const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); if (res.ok) setAuthenticated(true); else { const d = await res.json(); setLoginError(d.error || "Login failed"); } } catch { setLoginError("Network error"); } finally { setLoginLoading(false); }
  };
  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); setAuthenticated(false); };

  const uploadFile = async (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio"): Promise<string | null> => {
    setUploading(true);
    try { const fd = new FormData(); fd.append("file", file); fd.append("type", type); const res = await fetch("/api/upload", { method: "POST", body: fd }); if (!res.ok) { const e = await res.json(); toast(`Upload failed: ${e.error}`, true); return null; } const d = await res.json(); return d.path; } catch { toast("Upload failed", true); return null; } finally { setUploading(false); }
  };

  const saveSettings = async (updates: Partial<Settings>) => {
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    if (res.ok) { toast("Saved"); loadData(); } else toast("Failed to save", true);
  };

  const saveProject = async (project: Project) => {
    const res = await fetch(`/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) });
    if (res.ok) { toast("Project saved"); setEditingProject(null); loadData(); } else toast("Failed to save project", true);
  };
  const createProject = async () => {
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newProject) });
    if (res.ok) { toast("Project created"); setAddingProject(false); setNewProject(EMPTY_PROJECT); setTechInput(""); loadData(); } else toast("Failed to create project", true);
  };
  const removeProject = async (id: string) => { if (!confirm("Delete this project?")) return; const res = await fetch(`/api/projects/${id}`, { method: "DELETE" }); if (res.ok) { toast("Project deleted"); loadData(); } else toast("Failed to delete", true); };

  const saveSkill = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(skill) });
    if (res.ok) { toast("Skill saved"); setEditingSkill(null); loadData(); } else toast("Failed to save skill", true);
  };
  const createSkill = async (name: string, icon: string) => {
    const res = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, icon }) });
    if (res.ok) { toast("Skill added"); setAddingSkill(false); setNewSkillName(""); loadData(); } else toast("Failed to add skill", true);
  };
  const removeSkill = async (id: string) => { if (!confirm("Delete this skill?")) return; const res = await fetch(`/api/skills/${id}`, { method: "DELETE" }); if (res.ok) { toast("Skill deleted"); loadData(); } else toast("Failed to delete", true); };

  if (checking) return <div className="admin-loading"><div className="loader"></div></div>;

  if (!authenticated) {
    return (
      <div className="admin-login-wrapper">
        <form className="admin-login-form" onSubmit={handleLogin}>
          <h1 className="admin-login-title">Admin Login</h1>
          {loginError && <div className="admin-error">{loginError}</div>}
          <div className="admin-field"><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus /></div>
          <div className="admin-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={loginLoading}>{loginLoading ? "Logging in..." : "Login"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      {toasts.map((t) => <div key={t.id} className={`admin-toast ${t.error ? "error" : ""}`}>{t.msg}</div>)}

      <header className="admin-header">
        <h1>Portfolio Admin</h1>
        <button onClick={handleLogout} className="admin-btn admin-btn-outline">Logout</button>
      </header>

      <nav className="admin-tabs">
        {(["content", "projects", "skills", "navigation", "media"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </nav>

      <main className="admin-main">
        {/* ===== CONTENT TAB ===== */}
        {tab === "content" && (
          <section>
            <h2>Page Content</h2>
            <p style={{ color: "var(--gray-mid)", marginBottom: "1.5rem", fontSize: "0.85rem" }}>Use <code>*text*</code> for <em>italics</em> in text fields.</p>

            <div className="admin-section-card">
              <h3>About Section</h3>
              <div className="admin-field"><label>Heading</label><input type="text" value={contentForm.aboutHeading} onChange={(e) => setContentForm({ ...contentForm, aboutHeading: e.target.value })} placeholder="Building Efficient Systems" /></div>
              <div className="admin-field"><label>Body (one paragraph per line)</label><textarea value={contentForm.aboutText} onChange={(e) => setContentForm({ ...contentForm, aboutText: e.target.value })} rows={5} style={{ resize: "vertical" }} /></div>
            </div>

            <div className="admin-section-card">
              <h3>Quotes</h3>
              <div className="admin-field"><label>Quote 1 (between Hero &amp; About)</label><input type="text" value={contentForm.quote1} onChange={(e) => setContentForm({ ...contentForm, quote1: e.target.value })} placeholder="Enter a quote..." /></div>
              <div className="admin-field"><label>Quote 2 (between About &amp; Projects)</label><input type="text" value={contentForm.quote2} onChange={(e) => setContentForm({ ...contentForm, quote2: e.target.value })} placeholder="Enter a quote..." /></div>
            </div>

            <div className="admin-section-card">
              <h3>Projects Section</h3>
              <div className="admin-field"><label>Title</label><input type="text" value={contentForm.projectsTitle} onChange={(e) => setContentForm({ ...contentForm, projectsTitle: e.target.value })} placeholder="SOME OF THE THINGS I'VE BUILT" /></div>
            </div>

            <div className="admin-section-card">
              <h3>Contact Section</h3>
              <div className="admin-field"><label>Heading</label><input type="text" value={contentForm.contactHeading} onChange={(e) => setContentForm({ ...contentForm, contactHeading: e.target.value })} /></div>
              <div className="admin-field"><label>Body (one paragraph per line)</label><textarea value={contentForm.contactText} onChange={(e) => setContentForm({ ...contentForm, contactText: e.target.value })} rows={3} style={{ resize: "vertical" }} /></div>
              <div className="admin-field"><label>Email</label><input type="email" value={contentForm.contactEmail} onChange={(e) => setContentForm({ ...contentForm, contactEmail: e.target.value })} /></div>
              <div className="admin-field"><label>Location</label><input type="text" value={contentForm.contactLocation} onChange={(e) => setContentForm({ ...contentForm, contactLocation: e.target.value })} /></div>
            </div>

            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" onClick={() => saveSettings(contentForm)}>Save All Content</button>
            </div>
          </section>
        )}

        {/* ===== PROJECTS TAB ===== */}
        {tab === "projects" && (
          <section>
            <div className="admin-section-header"><h2>Projects</h2><button className="admin-btn admin-btn-primary" onClick={() => setAddingProject(true)}>+ Add Project</button></div>

            {addingProject && (
              <div className="admin-card admin-form-card">
                <h3>New Project</h3>
                <ProjectForm project={newProject} techInput={techInput} onChange={(p) => setNewProject(p)} onTechChange={setTechInput} onUploadIcon={async (file) => { const path = await uploadFile(file, "project_icon"); if (path) setNewProject({ ...newProject, icon: path }); }} uploading={uploading} />
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
                    <ProjectForm project={editingProject} techInput={editingProject.technologies.join(", ")} onChange={(p) => setEditingProject({ ...editingProject, ...p } as Project)} onTechChange={(v) => setEditingProject({ ...editingProject, technologies: v.split(",").map((t) => t.trim()).filter(Boolean) })} onUploadIcon={async (file) => { const path = await uploadFile(file, "project_icon"); if (path) setEditingProject({ ...editingProject, icon: path }); }} uploading={uploading} />
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
        )}

        {/* ===== SKILLS TAB ===== */}
        {tab === "skills" && (
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
        )}

        {/* ===== NAVIGATION TAB ===== */}
        {tab === "navigation" && (
          <section>
            <h2>Navigation & Footer</h2>

            <div className="admin-section-card">
              <h3>Navbar</h3>
              <label className="admin-toggle-switch" style={{ marginBottom: "1rem" }}>
                <input type="checkbox" checked={navForm.showNavbar} onChange={(e) => setNavForm({ ...navForm, showNavbar: e.target.checked })} />
                <span>{navForm.showNavbar ? "Visible" : "Hidden"}</span>
              </label>
              <div className="admin-links-list">
                {navForm.navLinks.map((link, i) => (
                  <div className="admin-link-row" key={i}>
                    <div className="admin-field" style={{ flex: 1, marginBottom: 0 }}><input type="text" value={link.label} onChange={(e) => { const links = [...navForm.navLinks]; links[i] = { ...links[i], label: e.target.value }; setNavForm({ ...navForm, navLinks: links }); }} placeholder="Label" /></div>
                    <div className="admin-field" style={{ flex: 2, marginBottom: 0 }}><input type="text" value={link.href} onChange={(e) => { const links = [...navForm.navLinks]; links[i] = { ...links[i], href: e.target.value }; setNavForm({ ...navForm, navLinks: links }); }} placeholder="#about or https://..." /></div>
                    <button className="admin-link-remove" onClick={() => { const links = navForm.navLinks.filter((_, j) => j !== i); setNavForm({ ...navForm, navLinks: links }); }}>×</button>
                  </div>
                ))}
              </div>
              <button className="admin-btn admin-btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => setNavForm({ ...navForm, navLinks: [...navForm.navLinks, { label: "", href: "" }] })}>+ Add Link</button>
            </div>

            <div className="admin-section-card">
              <h3>Footer Sections</h3>
              {footerForm.map((section, si) => (
                <div className="admin-footer-section" key={si}>
                  <div className="admin-footer-section-header">
                    <div className="admin-field" style={{ marginBottom: 0, flex: 1 }}><input type="text" value={section.title} onChange={(e) => { const s = [...footerForm]; s[si] = { ...s[si], title: e.target.value }; setFooterForm(s); }} placeholder="Section title" /></div>
                    <button className="admin-link-remove" onClick={() => setFooterForm(footerForm.filter((_, j) => j !== si))}>×</button>
                  </div>
                  <div className="admin-links-list">
                    {section.links.map((link, li) => (
                      <div className="admin-link-row" key={li}>
                        <div className="admin-field" style={{ flex: 1, marginBottom: 0 }}><input type="text" value={link.label} onChange={(e) => { const s = [...footerForm]; const links = [...s[si].links]; links[li] = { ...links[li], label: e.target.value }; s[si] = { ...s[si], links }; setFooterForm(s); }} placeholder="Label" /></div>
                        <div className="admin-field" style={{ flex: 2, marginBottom: 0 }}><input type="text" value={link.url} onChange={(e) => { const s = [...footerForm]; const links = [...s[si].links]; links[li] = { ...links[li], url: e.target.value }; s[si] = { ...s[si], links }; setFooterForm(s); }} placeholder="/projects or https://..." /></div>
                        <button className="admin-link-remove" onClick={() => { const s = [...footerForm]; s[si] = { ...s[si], links: s[si].links.filter((_, j) => j !== li) }; setFooterForm(s); }}>×</button>
                      </div>
                    ))}
                  </div>
                  <button className="admin-btn admin-btn-sm" style={{ marginTop: "0.5rem" }} onClick={() => { const s = [...footerForm]; s[si] = { ...s[si], links: [...s[si].links, { label: "", url: "" }] }; setFooterForm(s); }}>+ Add Link</button>
                </div>
              ))}
              <button className="admin-btn admin-btn-sm" style={{ marginTop: "0.75rem" }} onClick={() => setFooterForm([...footerForm, { title: "", links: [] }])}>+ Add Section</button>
            </div>

            <div className="admin-form-actions">
              <button className="admin-btn admin-btn-primary" onClick={() => saveSettings({ showNavbar: navForm.showNavbar, navLinks: navForm.navLinks, footerSections: footerForm })}>Save Navigation</button>
            </div>
          </section>
        )}

        {/* ===== MEDIA TAB ===== */}
        {tab === "media" && (
          <section>
            <h2>Media</h2>
            <div className="admin-media-grid">
              <div className="admin-card">
                <h3>Profile Image</h3>
                <p className="admin-hint">Max 800x800px, 2MB. jpg, png, webp</p>
                {settings.profileImage && <div className="admin-media-preview"><Image src={settings.profileImage} alt="Profile" width={200} height={200} style={{ objectFit: "cover" }} unoptimized /></div>}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, "profile"); if (path) await saveSettings({ profileImage: path }); }} style={{ flex: 1 }} />
                  <button className="admin-btn admin-btn-sm" onClick={() => openMediaPicker("profile", (url) => saveSettings({ profileImage: url }))}>Library</button>
                </div>
                {uploading && <span className="admin-uploading">Uploading...</span>}
              </div>
              <div className="admin-card">
                <h3>Background Audio</h3>
                <p className="admin-hint">Max 10MB. mp3, ogg, wav</p>
                {settings.audioFile && <div className="admin-media-preview"><audio controls src={settings.audioFile} style={{ width: "100%" }} /></div>}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                  <input type="file" accept="audio/mpeg,audio/ogg,audio/wav" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, "audio"); if (path) await saveSettings({ audioFile: path }); }} style={{ flex: 1 }} />
                  <button className="admin-btn admin-btn-sm" onClick={() => openMediaPicker("audio", (url) => saveSettings({ audioFile: url }))}>Library</button>
                </div>
                {uploading && <span className="admin-uploading">Uploading...</span>}
              </div>
            </div>
          </section>
        )}
      </main>

      {showMediaPicker && (
        <div className="admin-modal-overlay" onClick={() => setShowMediaPicker(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header"><h3>Media Library</h3><button className="admin-modal-close" onClick={() => setShowMediaPicker(false)}>×</button></div>
            <div className="admin-modal-body">
              {mediaFiles.length === 0 ? <p style={{ textAlign: "center", color: "#666" }}>No media files found.</p> : (
                <div className="admin-media-library-grid">
                  {mediaFiles.map((file) => (
                    <div key={file.id} className="admin-media-library-item" onClick={() => selectMedia(file.url)}>
                      {file.contentType.startsWith("image/") ? <Image src={file.url} alt={file.filename} width={120} height={120} style={{ objectFit: "cover" }} unoptimized /> : <div className="admin-media-audio-preview"><span>🎵</span><small>{file.filename}</small></div>}
                      <div className="admin-media-library-info"><small>{file.filename.substring(0, 20)}{file.filename.length > 20 ? "..." : ""}</small><small>{(file.size / 1024).toFixed(1)} KB</small></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
