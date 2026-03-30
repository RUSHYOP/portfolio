"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Settings } from "./types";

type ContentFormState = {
  aboutHeading: string;
  aboutText: string;
  quote1: string;
  quote2: string;
  projectsTitle: string;
  contactHeading: string;
  contactText: string;
  contactEmail: string;
  contactLocation: string;
  showHeroButton: boolean;
};

interface ContentTabProps {
  settings: Settings;
  onSave: (updates: Partial<Settings>) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

function formFromSettings(s: Settings): ContentFormState {
  return {
    aboutHeading: s.aboutHeading || "",
    aboutText: s.aboutText || "",
    quote1: s.quote1 || "",
    quote2: s.quote2 || "",
    projectsTitle: s.projectsTitle || "",
    contactHeading: s.contactHeading || "",
    contactText: s.contactText || "",
    contactEmail: s.contactEmail || "",
    contactLocation: s.contactLocation || "",
    showHeroButton: s.showHeroButton ?? true,
  };
}

function isFormDirty(current: ContentFormState, clean: ContentFormState): boolean {
  return (Object.keys(clean) as (keyof ContentFormState)[]).some(
    (k) => current[k] !== clean[k],
  );
}

function renderItalicPreview(text: string): React.ReactNode[] {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const previewStyle: React.CSSProperties = {
  marginTop: "0.35rem",
  padding: "0.5rem 0.65rem",
  background: "var(--gray-bg, #f5f5f5)",
  borderRadius: "4px",
  fontSize: "0.82rem",
  lineHeight: 1.5,
  color: "var(--gray-dark, #444)",
  whiteSpace: "pre-wrap",
};

const previewLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "var(--gray-mid, #888)",
  marginRight: "0.4rem",
};

const charCountStyle: React.CSSProperties = {
  marginTop: "0.25rem",
  fontSize: "0.75rem",
  color: "var(--gray-mid, #999)",
  textAlign: "right",
};

const requiredStar: React.CSSProperties = {
  color: "#e53e3e",
  marginLeft: "2px",
};

const emailErrorStyle: React.CSSProperties = {
  marginTop: "0.25rem",
  fontSize: "0.78rem",
  color: "#e53e3e",
};

const unsavedBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  marginLeft: "0.75rem",
  padding: "0.2rem 0.55rem",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontWeight: 500,
  background: "rgba(234, 179, 8, 0.15)",
  color: "#b45309",
};

export default function ContentTab({ settings, onSave, onDirtyChange }: ContentTabProps) {
  const [saving, setSaving] = useState(false);
  const [contentForm, setContentForm] = useState<ContentFormState>(() => formFromSettings(settings));
  const cleanRef = useRef<ContentFormState>(formFromSettings(settings));
  const [dirty, setDirty] = useState(false);

  // Sync clean snapshot when settings change externally
  useEffect(() => {
    const next = formFromSettings(settings);
    cleanRef.current = next;
    setContentForm(next);
    setDirty(false);
    onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const updateForm = useCallback(
    (patch: Partial<ContentFormState>) => {
      setContentForm((prev) => {
        const next = { ...prev, ...patch };
        const nowDirty = isFormDirty(next, cleanRef.current);
        setDirty(nowDirty);
        onDirtyChange?.(nowDirty);
        return next;
      });
    },
    [onDirtyChange],
  );

  const emailInvalid = useMemo(
    () => contentForm.contactEmail.length > 0 && !EMAIL_RE.test(contentForm.contactEmail),
    [contentForm.contactEmail],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(contentForm);
      cleanRef.current = { ...contentForm };
      setDirty(false);
      onDirtyChange?.(false);
    } finally {
      setSaving(false);
    }
  }, [contentForm, onSave, onDirtyChange]);

  return (
    <section>
      <h2>Page Content</h2>
      <p style={{ color: "var(--gray-mid)", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
        Use <code>*text*</code> for <em>italics</em> in text fields.
      </p>

      {/* Hero */}
      <div className="admin-section-card">
        <h3>Hero Section</h3>
        <label className="admin-toggle-switch">
          <input
            type="checkbox"
            checked={contentForm.showHeroButton}
            onChange={(e) => updateForm({ showHeroButton: e.target.checked })}
          />
          <span>&quot;HIT IT&quot; Button: {contentForm.showHeroButton ? "Visible" : "Hidden"}</span>
        </label>
      </div>

      {/* About */}
      <div className="admin-section-card">
        <h3>About Section</h3>

        <div className="admin-field">
          <label>
            Heading<span style={requiredStar}>*</span>
          </label>
          <input
            type="text"
            value={contentForm.aboutHeading}
            onChange={(e) => updateForm({ aboutHeading: e.target.value })}
            placeholder="Building Efficient Systems"
          />
        </div>

        <div className="admin-field">
          <label>Body (one paragraph per line)</label>
          <textarea
            value={contentForm.aboutText}
            onChange={(e) => updateForm({ aboutText: e.target.value })}
            rows={5}
            style={{ resize: "vertical" }}
          />
          <div style={charCountStyle}>{contentForm.aboutText.length} / 2000 characters</div>
          {contentForm.aboutText && (
            <div style={previewStyle}>
              <span style={previewLabelStyle}>Preview:</span>
              {renderItalicPreview(contentForm.aboutText)}
            </div>
          )}
        </div>
      </div>

      {/* Quotes */}
      <div className="admin-section-card">
        <h3>Quotes</h3>

        <div className="admin-field">
          <label>Quote 1 (between Hero &amp; About)</label>
          <input
            type="text"
            value={contentForm.quote1}
            onChange={(e) => updateForm({ quote1: e.target.value })}
            placeholder="Enter a quote..."
          />
          {contentForm.quote1 && (
            <div style={previewStyle}>
              <span style={previewLabelStyle}>Preview:</span>
              {renderItalicPreview(contentForm.quote1)}
            </div>
          )}
        </div>

        <div className="admin-field">
          <label>Quote 2 (between About &amp; Projects)</label>
          <input
            type="text"
            value={contentForm.quote2}
            onChange={(e) => updateForm({ quote2: e.target.value })}
            placeholder="Enter a quote..."
          />
          {contentForm.quote2 && (
            <div style={previewStyle}>
              <span style={previewLabelStyle}>Preview:</span>
              {renderItalicPreview(contentForm.quote2)}
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="admin-section-card">
        <h3>Projects Section</h3>
        <div className="admin-field">
          <label>Title</label>
          <input
            type="text"
            value={contentForm.projectsTitle}
            onChange={(e) => updateForm({ projectsTitle: e.target.value })}
            placeholder="SOME OF THE THINGS I'VE BUILT"
          />
        </div>
      </div>

      {/* Contact */}
      <div className="admin-section-card">
        <h3>Contact Section</h3>

        <div className="admin-field">
          <label>Heading</label>
          <input
            type="text"
            value={contentForm.contactHeading}
            onChange={(e) => updateForm({ contactHeading: e.target.value })}
          />
        </div>

        <div className="admin-field">
          <label>Body (one paragraph per line)</label>
          <textarea
            value={contentForm.contactText}
            onChange={(e) => updateForm({ contactText: e.target.value })}
            rows={3}
            style={{ resize: "vertical" }}
          />
          <div style={charCountStyle}>{contentForm.contactText.length} / 2000 characters</div>
          {contentForm.contactText && (
            <div style={previewStyle}>
              <span style={previewLabelStyle}>Preview:</span>
              {renderItalicPreview(contentForm.contactText)}
            </div>
          )}
        </div>

        <div className="admin-field">
          <label>
            Email<span style={requiredStar}>*</span>
          </label>
          <input
            type="email"
            value={contentForm.contactEmail}
            onChange={(e) => updateForm({ contactEmail: e.target.value })}
          />
          {emailInvalid && (
            <div style={emailErrorStyle}>Please enter a valid email address.</div>
          )}
        </div>

        <div className="admin-field">
          <label>Location</label>
          <input
            type="text"
            value={contentForm.contactLocation}
            onChange={(e) => updateForm({ contactLocation: e.target.value })}
          />
        </div>
      </div>

      <div className="admin-form-actions">
        <button
          className="admin-btn admin-btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save All Content"}
        </button>
        {dirty && <span style={unsavedBadgeStyle}>Unsaved changes</span>}
      </div>
    </section>
  );
}
