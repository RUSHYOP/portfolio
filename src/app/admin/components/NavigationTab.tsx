"use client";

import { useState, useEffect } from "react";
import type { Settings, NavLink, FooterSection } from "./types";

interface NavigationTabProps {
  settings: Settings;
  onSave: (updates: Partial<Settings>) => Promise<void>;
}

export default function NavigationTab({ settings, onSave }: NavigationTabProps) {
  const [saving, setSaving] = useState(false);
  const [navForm, setNavForm] = useState<{ showNavbar: boolean; navLinks: NavLink[] }>({ showNavbar: true, navLinks: [] });
  const [footerForm, setFooterForm] = useState<FooterSection[]>([]);

  useEffect(() => {
    setNavForm({ showNavbar: settings.showNavbar ?? true, navLinks: settings.navLinks || [] });
    setFooterForm(settings.footerSections || []);
  }, [settings]);

  return (
    <section>
      <h2>Navigation &amp; Footer</h2>

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
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ showNavbar: navForm.showNavbar, navLinks: navForm.navLinks, footerSections: footerForm }); } finally { setSaving(false); } }}>{saving ? "Saving..." : "Save Navigation"}</button>
      </div>
    </section>
  );
}
