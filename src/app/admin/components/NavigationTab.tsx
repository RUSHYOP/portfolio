"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Settings, NavLink, FooterSection } from "./types";

interface NavigationTabProps {
  settings: Settings;
  onSave: (updates: Partial<Settings>) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  const copy = [...arr];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}

function navLinkWarning(link: NavLink): string | null {
  const hasLabel = link.label.trim().length > 0;
  const hasHref = link.href.trim().length > 0;
  if (hasLabel !== hasHref) return "Both label and URL are required";
  return null;
}

function footerLinkWarning(link: { label: string; url: string }): string | null {
  const hasLabel = link.label.trim().length > 0;
  const hasUrl = link.url.trim().length > 0;
  if (hasLabel !== hasUrl) return "Both label and URL are required";
  return null;
}

export default function NavigationTab({
  settings,
  onSave,
  onDirtyChange,
}: NavigationTabProps) {
  const [saving, setSaving] = useState(false);
  const [navForm, setNavForm] = useState<{
    showNavbar: boolean;
    navLinks: NavLink[];
  }>({ showNavbar: true, navLinks: [] });
  const [footerForm, setFooterForm] = useState<FooterSection[]>([]);

  useEffect(() => {
    setNavForm({
      showNavbar: settings.showNavbar ?? true,
      navLinks: settings.navLinks || [],
    });
    setFooterForm(settings.footerSections || []);
  }, [settings]);

  const isDirty = useMemo(() => {
    const origNav = settings.navLinks || [];
    const origFooter = settings.footerSections || [];
    const origShow = settings.showNavbar ?? true;

    if (navForm.showNavbar !== origShow) return true;
    if (JSON.stringify(navForm.navLinks) !== JSON.stringify(origNav)) return true;
    if (JSON.stringify(footerForm) !== JSON.stringify(origFooter)) return true;
    return false;
  }, [navForm, footerForm, settings]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateNavLink = useCallback(
    (i: number, patch: Partial<NavLink>) => {
      const links = [...navForm.navLinks];
      links[i] = { ...links[i], ...patch };
      setNavForm({ ...navForm, navLinks: links });
    },
    [navForm],
  );

  const removeNavLink = useCallback(
    (i: number) => {
      setNavForm({
        ...navForm,
        navLinks: navForm.navLinks.filter((_, j) => j !== i),
      });
    },
    [navForm],
  );

  const updateFooterSection = useCallback(
    (si: number, patch: Partial<FooterSection>) => {
      const s = [...footerForm];
      s[si] = { ...s[si], ...patch };
      setFooterForm(s);
    },
    [footerForm],
  );

  const updateFooterLink = useCallback(
    (si: number, li: number, patch: Partial<{ label: string; url: string }>) => {
      const s = [...footerForm];
      const links = [...s[si].links];
      links[li] = { ...links[li], ...patch };
      s[si] = { ...s[si], links };
      setFooterForm(s);
    },
    [footerForm],
  );

  const removeFooterLink = useCallback(
    (si: number, li: number) => {
      const s = [...footerForm];
      s[si] = {
        ...s[si],
        links: s[si].links.filter((_, j) => j !== li),
      };
      setFooterForm(s);
    },
    [footerForm],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        showNavbar: navForm.showNavbar,
        navLinks: navForm.navLinks,
        footerSections: footerForm,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2>Navigation &amp; Footer</h2>

      {/* ── Navbar ── */}
      <div className="admin-section-card">
        <h3>Navbar</h3>
        <label className="admin-toggle-switch" style={{ marginBottom: "1rem" }}>
          <input
            type="checkbox"
            checked={navForm.showNavbar}
            onChange={(e) =>
              setNavForm({ ...navForm, showNavbar: e.target.checked })
            }
          />
          <span>{navForm.showNavbar ? "Visible" : "Hidden"}</span>
        </label>

        <div className="admin-links-list">
          {navForm.navLinks.length === 0 && (
            <p style={{ color: "var(--admin-muted, #888)", fontStyle: "italic", margin: "0.5rem 0" }}>
              No navigation links. Add links to create a navbar.
            </p>
          )}

          {navForm.navLinks.map((link, i) => {
            const warning = navLinkWarning(link);
            return (
              <div key={i}>
                <div className="admin-link-row">
                  <div className="admin-field" style={{ flex: 1, marginBottom: 0 }}>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateNavLink(i, { label: e.target.value })}
                      placeholder="Label"
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 2, marginBottom: 0 }}>
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateNavLink(i, { href: e.target.value })}
                      placeholder="#about or https://..."
                    />
                  </div>
                  <button
                    className="admin-link-remove"
                    aria-label={`Move nav link ${link.label || "untitled"} up`}
                    disabled={i === 0}
                    onClick={() =>
                      setNavForm({ ...navForm, navLinks: swap(navForm.navLinks, i, i - 1) })
                    }
                    style={{ opacity: i === 0 ? 0.3 : 1 }}
                  >
                    ↑
                  </button>
                  <button
                    className="admin-link-remove"
                    aria-label={`Move nav link ${link.label || "untitled"} down`}
                    disabled={i === navForm.navLinks.length - 1}
                    onClick={() =>
                      setNavForm({ ...navForm, navLinks: swap(navForm.navLinks, i, i + 1) })
                    }
                    style={{ opacity: i === navForm.navLinks.length - 1 ? 0.3 : 1 }}
                  >
                    ↓
                  </button>
                  <button
                    className="admin-link-remove"
                    aria-label={`Remove nav link ${link.label || "untitled"}`}
                    onClick={() => removeNavLink(i)}
                  >
                    ×
                  </button>
                </div>
                {warning && (
                  <p style={{ color: "var(--admin-warning, #c89520)", fontSize: "0.82rem", margin: "0.15rem 0 0.35rem" }}>
                    {warning}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          className="admin-btn admin-btn-sm"
          style={{ marginTop: "0.75rem" }}
          onClick={() =>
            setNavForm({
              ...navForm,
              navLinks: [...navForm.navLinks, { label: "", href: "" }],
            })
          }
        >
          + Add Link
        </button>
      </div>

      {/* ── Footer Sections ── */}
      <div className="admin-section-card">
        <h3>Footer Sections</h3>

        {footerForm.length === 0 && (
          <p style={{ color: "var(--admin-muted, #888)", fontStyle: "italic", margin: "0.5rem 0" }}>
            No footer sections yet.
          </p>
        )}

        {footerForm.map((section, si) => (
          <div className="admin-footer-section" key={si}>
            <div className="admin-footer-section-header">
              <div className="admin-field" style={{ marginBottom: 0, flex: 1 }}>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateFooterSection(si, { title: e.target.value })}
                  placeholder="Section title"
                />
              </div>
              <button
                className="admin-link-remove"
                aria-label={`Move footer section ${section.title || "untitled"} up`}
                disabled={si === 0}
                onClick={() => setFooterForm(swap(footerForm, si, si - 1))}
                style={{ opacity: si === 0 ? 0.3 : 1 }}
              >
                ↑
              </button>
              <button
                className="admin-link-remove"
                aria-label={`Move footer section ${section.title || "untitled"} down`}
                disabled={si === footerForm.length - 1}
                onClick={() => setFooterForm(swap(footerForm, si, si + 1))}
                style={{ opacity: si === footerForm.length - 1 ? 0.3 : 1 }}
              >
                ↓
              </button>
              <button
                className="admin-link-remove"
                aria-label={`Remove footer section ${section.title || "untitled"}`}
                onClick={() => setFooterForm(footerForm.filter((_, j) => j !== si))}
              >
                ×
              </button>
            </div>

            <div className="admin-links-list">
              {section.links.map((link, li) => {
                const warning = footerLinkWarning(link);
                return (
                  <div key={li}>
                    <div className="admin-link-row">
                      <div className="admin-field" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) =>
                            updateFooterLink(si, li, { label: e.target.value })
                          }
                          placeholder="Label"
                        />
                      </div>
                      <div className="admin-field" style={{ flex: 2, marginBottom: 0 }}>
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) =>
                            updateFooterLink(si, li, { url: e.target.value })
                          }
                          placeholder="/projects or https://..."
                        />
                      </div>
                      <button
                        className="admin-link-remove"
                        aria-label={`Remove footer link ${link.label || "untitled"}`}
                        onClick={() => removeFooterLink(si, li)}
                      >
                        ×
                      </button>
                    </div>
                    {warning && (
                      <p style={{ color: "var(--admin-warning, #c89520)", fontSize: "0.82rem", margin: "0.15rem 0 0.35rem" }}>
                        {warning}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="admin-btn admin-btn-sm"
              style={{ marginTop: "0.5rem" }}
              onClick={() => {
                const s = [...footerForm];
                s[si] = {
                  ...s[si],
                  links: [...s[si].links, { label: "", url: "" }],
                };
                setFooterForm(s);
              }}
            >
              + Add Link
            </button>
          </div>
        ))}

        <button
          className="admin-btn admin-btn-sm"
          style={{ marginTop: "0.75rem" }}
          onClick={() =>
            setFooterForm([...footerForm, { title: "", links: [] }])
          }
        >
          + Add Section
        </button>
      </div>

      {/* ── Save ── */}
      <div className="admin-form-actions">
        {isDirty && (
          <span style={{ color: "var(--admin-warning, #c89520)", fontSize: "0.85rem", marginRight: "0.75rem" }}>
            ● Unsaved changes
          </span>
        )}
        <button
          className="admin-btn admin-btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Navigation"}
        </button>
      </div>
    </section>
  );
}
