"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Settings, Project, Skill, Tab } from "./components/types";
import { DEFAULT_SETTINGS } from "./components/types";
import ContentTab from "./components/ContentTab";
import ProjectsTab from "./components/ProjectsTab";
import SkillsTab from "./components/SkillsTab";
import NavigationTab from "./components/NavigationTab";
import MediaTab from "./components/MediaTab";

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

  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; error?: boolean; undo?: () => void }[]>([]);
  const toastId = useRef(0);
  const dirtyTabs = useRef(new Set<Tab>());

  const toast = useCallback((msg: string, error = false, undo?: () => void) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, error, undo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), undo ? 6000 : 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setDirty = useCallback((tabName: Tab, dirty: boolean) => {
    if (dirty) dirtyTabs.current.add(tabName);
    else dirtyTabs.current.delete(tabName);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyTabs.current.size > 0) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const switchTab = useCallback((next: Tab) => {
    if (dirtyTabs.current.size > 0 && !dirtyTabs.current.has(next)) {
      const names = Array.from(dirtyTabs.current).join(", ");
      if (!window.confirm(`You have unsaved changes in: ${names}. Switch tab anyway?`)) return;
      dirtyTabs.current.clear();
    }
    setTab(next);
  }, []);

  useEffect(() => { fetch("/api/auth/verify").then((r) => { if (r.ok) setAuthenticated(true); }).finally(() => setChecking(false)); }, []);

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    const [pRes, sRes, setRes] = await Promise.all([fetch("/api/projects"), fetch("/api/skills"), fetch("/api/settings")]);
    if (pRes.ok) setProjects(await pRes.json());
    if (sRes.ok) setSkills(await sRes.json());
    if (setRes.ok) { const s: Settings = await setRes.json(); setSettings(s); }
  }, [authenticated]);

  useEffect(() => { loadData(); }, [loadData]);

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
    if (res.ok) { toast("Saved"); dirtyTabs.current.delete(tab); loadData(); } else { const d = await res.json().catch(() => null); toast(d?.error || "Failed to save", true); }
  };

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
      <div className="admin-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast ${t.error ? "error" : ""}`}>
            <span>{t.msg}</span>
            {t.undo && <button className="admin-toast-undo" onClick={() => { t.undo!(); dismissToast(t.id); }}>Undo</button>}
          </div>
        ))}
      </div>

      <header className="admin-header">
        <h1>Portfolio Admin</h1>
        <button onClick={handleLogout} className="admin-btn admin-btn-outline">Logout</button>
      </header>

      <nav className="admin-tabs">
        {(["content", "projects", "skills", "navigation", "media"] as Tab[]).map((t) => (
          <button key={t} className={`admin-tab ${tab === t ? "active" : ""}`} onClick={() => switchTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === "content" && <ContentTab settings={settings} onSave={saveSettings} onDirtyChange={(d) => setDirty("content", d)} />}
        {tab === "projects" && <ProjectsTab projects={projects} uploading={uploading} toast={toast} loadData={loadData} uploadFile={uploadFile} onDirtyChange={(d) => setDirty("projects", d)} />}
        {tab === "skills" && <SkillsTab skills={skills} uploading={uploading} toast={toast} loadData={loadData} uploadFile={uploadFile} onDirtyChange={(d) => setDirty("skills", d)} />}
        {tab === "navigation" && <NavigationTab settings={settings} onSave={saveSettings} onDirtyChange={(d) => setDirty("navigation", d)} />}
        {tab === "media" && <MediaTab settings={settings} uploading={uploading} toast={toast} uploadFile={uploadFile} onSave={saveSettings} />}
      </main>
    </div>
  );
}
