import { ImageResponse } from "next/og";
export const runtime = "nodejs";
export const alt = "Purav S — Thoughtful code. Useful software.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        background: "#181818",
        color: "#f0eee9",
        padding: "65px",
      }}
    >
      <div style={{ display: "flex", fontSize: 32 }}>
        purav
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 86,
          letterSpacing: "-4px",
          lineHeight: 1.1,
        }}
      >
        <span>Thoughtful code.</span>
        <span style={{ color: "#ff835f" }}>Useful software.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 18,
          color: "#b5b5b2",
        }}
      >
        <span>SOFTWARE DEVELOPER</span>
        <span>BANGALORE, INDIA</span>
      </div>
    </div>,
    size,
  );
}
