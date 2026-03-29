"use client";

import { useState, useEffect } from "react";
import type { Settings } from "./types";

interface ContentTabProps {
  settings: Settings;
  onSave: (updates: Partial<Settings>) => Promise<void>;
}

export default function ContentTab({ settings, onSave }: ContentTabProps) {
  const [saving, setSaving] = useState(false);
  const [contentForm, setContentForm] = useState({
    aboutHeading: "", aboutText: "", quote1: "", quote2: "", projectsTitle: "",
    contactHeading: "", contactText: "", contactEmail: "", contactLocation: "",
    showHeroButton: true,
  });

  useEffect(() => {
    setContentForm({
      aboutHeading: settings.aboutHeading || "", aboutText: settings.aboutText || "",
      quote1: settings.quote1 || "", quote2: settings.quote2 || "",
      projectsTitle: settings.projectsTitle || "",
      contactHeading: settings.contactHeading || "", contactText: settings.contactText || "",
      contactEmail: settings.contactEmail || "", contactLocation: settings.contactLocation || "",
      showHeroButton: settings.showHeroButton ?? true,
    });
  }, [settings]);

  return (
    <section>
      <h2>Page Content</h2>
      <p style={{ color: "var(--gray-mid)", marginBottom: "1.5rem", fontSize: "0.85rem" }}>Use <code>*text*</code> for <em>italics</em> in text fields.</p>

      <div className="admin-section-card">
        <h3>Hero Section</h3>
        <label className="admin-toggle-switch">
          <input type="checkbox" checked={contentForm.showHeroButton} onChange={(e) => setContentForm({ ...contentForm, showHeroButton: e.target.checked })} />
          <span>&quot;HIT IT&quot; Button: {contentForm.showHeroButton ? "Visible" : "Hidden"}</span>
        </label>
      </div>

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
        <button className="admin-btn admin-btn-primary" disabled={saving} onClick={async () => { setSaving(true); try { await onSave(contentForm); } finally { setSaving(false); } }}>{saving ? "Saving..." : "Save All Content"}</button>
      </div>
    </section>
  );
}
