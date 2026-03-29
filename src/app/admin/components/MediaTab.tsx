"use client";

import { useState } from "react";
import Image from "next/image";
import type { Settings, MediaFile } from "./types";

interface MediaTabProps {
  settings: Settings;
  uploading: boolean;
  toast: (msg: string, error?: boolean) => void;
  uploadFile: (file: File, type: "profile" | "project_icon" | "skill_icon" | "audio") => Promise<string | null>;
  onSave: (updates: Partial<Settings>) => Promise<void>;
}

export default function MediaTab({ settings, uploading, toast, uploadFile, onSave }: MediaTabProps) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string) => void) | null>(null);

  const openMediaPicker = async (type: string, callback: (url: string) => void) => {
    setMediaPickerCallback(() => callback);
    setShowMediaPicker(true);
    try { const res = await fetch(`/api/media?type=${type}`); if (res.ok) setMediaFiles(await res.json()); } catch { toast("Failed to load media library", true); }
  };
  const selectMedia = (url: string) => { mediaPickerCallback?.(url); setShowMediaPicker(false); setMediaFiles([]); };

  return (
    <>
      <section>
        <h2>Media</h2>
        <div className="admin-media-grid">
          <div className="admin-card">
            <h3>Profile Image</h3>
            <p className="admin-hint">Max 800x800px, 2MB. jpg, png, webp</p>
            {settings.profileImage && <div className="admin-media-preview"><Image src={settings.profileImage} alt="Profile" width={200} height={200} style={{ objectFit: "cover" }} unoptimized /></div>}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, "profile"); if (path) await onSave({ profileImage: path }); }} style={{ flex: 1 }} />
              <button className="admin-btn admin-btn-sm" onClick={() => openMediaPicker("profile", (url) => onSave({ profileImage: url }))}>Library</button>
            </div>
            {uploading && <span className="admin-uploading">Uploading...</span>}
          </div>
          <div className="admin-card">
            <h3>Background Audio</h3>
            <p className="admin-hint">Max 10MB. mp3, ogg, wav</p>
            {settings.audioFile && <div className="admin-media-preview"><audio controls src={settings.audioFile} style={{ width: "100%" }} /></div>}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
              <input type="file" accept="audio/mpeg,audio/ogg,audio/wav" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const path = await uploadFile(file, "audio"); if (path) await onSave({ audioFile: path }); }} style={{ flex: 1 }} />
              <button className="admin-btn admin-btn-sm" onClick={() => openMediaPicker("audio", (url) => onSave({ audioFile: url }))}>Library</button>
            </div>
            {uploading && <span className="admin-uploading">Uploading...</span>}
          </div>
        </div>
      </section>

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
    </>
  );
}
