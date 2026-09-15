"use client";

import { useCallback, useRef } from "react";
// Defs come from the client-safe barrel: "@/lib/collections" builds Mongoose models.
import { ALL_DEFS } from "@/lib/collections/defs";
import CollectionTab from "./CollectionTab";
import type { CollectionItem, UploadType } from "./types";

interface Props {
  services: CollectionItem[];
  process: CollectionItem[];
  toast: (msg: string, error?: boolean) => void;
  loadData: () => Promise<void>;
  uploadFile: (file: File, type: UploadType) => Promise<string | null>;
  uploading: boolean;
  loading?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Services above Process — both plain reorderable lists. */
export default function ConsultingTab({ services, process, toast, loadData, uploadFile, uploading, loading, onDirtyChange }: Props) {
  // Two CollectionTabs share one dirty slot on the page. Forwarding both flags to the same
  // callback would let the second child's `false` cancel the first child's `true` on every
  // render — and, since the page's callback identity changes each render, re-run both
  // effects forever. Track each child's flag and report only their OR.
  const flags = useRef({ services: false, process: false });
  const report = useCallback(
    (key: "services" | "process", dirty: boolean) => {
      flags.current[key] = dirty;
      onDirtyChange?.(flags.current.services || flags.current.process);
    },
    [onDirtyChange],
  );
  const servicesDirty = useCallback((d: boolean) => report("services", d), [report]);
  const processDirty = useCallback((d: boolean) => report("process", d), [report]);

  return (
    <>
      <CollectionTab
        def={ALL_DEFS.services}
        apiBase="/api/services"
        title="Services"
        items={services}
        toast={toast}
        loadData={loadData}
        uploadFile={uploadFile}
        uploading={uploading}
        loading={loading}
        onDirtyChange={servicesDirty}
      />
      <hr style={{ margin: "2rem 0", opacity: 0.2 }} />
      <CollectionTab
        def={ALL_DEFS.process}
        apiBase="/api/process"
        title="Process steps"
        items={process}
        toast={toast}
        loadData={loadData}
        uploadFile={uploadFile}
        uploading={uploading}
        loading={loading}
        onDirtyChange={processDirty}
      />
    </>
  );
}
