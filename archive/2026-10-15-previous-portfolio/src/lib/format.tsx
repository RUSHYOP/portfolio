import React from "react";

export interface Segment {
  text: string;
  italic: boolean;
}

export function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const parts = raw.split(/(\*[^*]+\*)/g);
  for (const part of parts) {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      segments.push({ text: part.slice(1, -1), italic: true });
    } else if (part) {
      segments.push({ text: part, italic: false });
    }
  }
  return segments;
}

export function renderFormatted(text: string): React.ReactNode[] {
  return parseSegments(text).map((seg, i) =>
    seg.italic ? <em key={i}>{seg.text}</em> : <React.Fragment key={i}>{seg.text}</React.Fragment>
  );
}
