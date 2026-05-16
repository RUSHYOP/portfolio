"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Settings, Project, Skill, Tab } from "./components/types";
import { DEFAULT_SETTINGS } from "./components/types";
import ContentTab from "./components/ContentTab";
import ProjectsTab from "./components/ProjectsTab";
import SkillsTab from "./components/SkillsTab";
import NavigationTab from "./components/NavigationTab";
import MediaTab from "./components/MediaTab";

const TABS: Tab[] = ["content", "projects", "skills", "navigation", "media"];

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
  const [dirtyVersion, setDirtyVersion] = useState(0); // re-renders pulse indicators

  const toast = useCallback((msg: string, error = false, undo?: () => void) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, error, undo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), undo ? 6000 : 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setDirty = useCallback((tabName: Tab, dirty: boolean) => {
    const before = dirtyTabs.current.has(tabName);
    if (dirty) dirtyTabs.current.add(tabName);
    else dirtyTabs.current.delete(tabName);
    if (before !== dirty) setDirtyVersion((v) => v + 1);
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
      setDirtyVersion((v) => v + 1);
    }
    setTab(next);
  }, []);

  useEffect(() => {
    fetch("/api/auth/verify").then((r) => { if (r.ok) setAuthenticated(true); }).finally(() => setChecking(false));
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl + 1..5 → switch tabs, Esc → dismiss newest toast
  useEffect(() => {
    if (!authenticated) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= String(TABS.length)) {
        const idx = parseInt(e.key, 10) - 1;
        const target = TABS[idx];
        if (target) {
          e.preventDefault();
          switchTab(target);
        }
        return;
      }
      if (e.key === "Escape") {
        setToasts((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authenticated, switchTab]);

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    const [pRes, sRes, setRes] = await Promise.all([fetch("/api/projects"), fetch("/api/skills"), fetch("/api/settings")]);
    if (pRes.ok) setProjects(await pRes.json());
    if (sRes.ok) setSkills(await sRes.json());
    if (setRes.ok) { const s: Settings = await setRes.json(); setSettings(s); }
  }, [authenticated]);

  useEffect(() => { loadData(); }, [loadData]);

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
      if (res.ok) setAuthenticated(true);
      else {
        const d = await res.json();
        setLoginError(d.error || "Login failed");
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

  const uploadFile = async (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio"): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json();
        toast(`Upload failed: ${e.error}`, true);
        return null;
      }
      const d = await res.json();
      return d.path;
    } catch {
      toast("Upload failed", true);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async (updates: Partial<Settings>) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      toast("Saved");
      dirtyTabs.current.delete(tab);
      setDirtyVersion((v) => v + 1);
      loadData();
    } else {
      const d = await res.json().catch(() => null);
      toast(d?.error || "Failed to save", true);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div className="admin-loading">
        <div className="admin-progress">
          <motion.div
            className="admin-progress-bar"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-login-wrapper">
        <motion.form
          className="admin-login-form"
          onSubmit={handleLogin}
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <h1 className="admin-login-title">Admin Login</h1>
          <AnimatePresence>
            {loginError && (
              <motion.div
                key="login-error"
                className="admin-error"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="admin-field">
            <label htmlFor="admin-email">Email</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <motion.button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={loginLoading}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            {loginLoading ? "Logging in..." : "Login"}
          </motion.button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-toast-container">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`admin-toast ${t.error ? "error" : ""}`}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              layout
            >
              <span>{t.msg}</span>
              {t.undo && (
                <button
                  className="admin-toast-undo"
                  onClick={() => {
                    t.undo!();
                    dismissToast(t.id);
                  }}
                >
                  Undo
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <header className="admin-header">
        <h1>
          Portfolio Admin
          <span className="admin-header-mark">// CONTROL</span>
        </h1>
        <motion.button
          onClick={handleLogout}
          className="admin-btn admin-btn-outline"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          Logout
        </motion.button>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map((t) => {
          const isActive = tab === t;
          const isDirty = dirtyTabs.current.has(t);
          return (
            <button
              key={t}
              className={`admin-tab ${isActive ? "active" : ""}`}
              onClick={() => switchTab(t)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="admin-tab-label">
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {isDirty && (
                  <motion.span
                    className="admin-dirty-pulse"
                    aria-label="unsaved changes"
                    title="Unsaved changes"
                    animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    // dirtyVersion used to ensure visibility refresh
                    key={`${t}-${dirtyVersion}`}
                  />
                )}
              </span>
              {isActive && (
                <motion.span
                  layoutId="admin-tab-indicator"
                  className="admin-tab-indicator"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
            </button>
          );
        })}
        <span className="admin-shortcut-hint" aria-hidden="true">⌘1–5 to switch</span>
      </nav>

      <main className="admin-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="admin-tab-panel"
          >
            {tab === "content" && <ContentTab settings={settings} onSave={saveSettings} onDirtyChange={(d) => setDirty("content", d)} />}
            {tab === "projects" && <ProjectsTab projects={projects} uploading={uploading} toast={toast} loadData={loadData} uploadFile={uploadFile} onDirtyChange={(d) => setDirty("projects", d)} />}
            {tab === "skills" && <SkillsTab skills={skills} uploading={uploading} toast={toast} loadData={loadData} uploadFile={uploadFile} onDirtyChange={(d) => setDirty("skills", d)} />}
            {tab === "navigation" && <NavigationTab settings={settings} onSave={saveSettings} onDirtyChange={(d) => setDirty("navigation", d)} />}
            {tab === "media" && <MediaTab settings={settings} uploading={uploading} toast={toast} uploadFile={uploadFile} onSave={saveSettings} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
