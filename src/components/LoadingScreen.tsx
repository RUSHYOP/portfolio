"use client";

import { useState, useEffect } from "react";

interface LoadingScreenProps {
  loading: boolean;
}

const loadingTexts = [
  "Initializing Systems...",
  "Loading Backend Services...",
  "Connecting to Databases...",
  "Optimizing Performance...",
  "Almost ready...",
];

export default function LoadingScreen({ loading }: LoadingScreenProps) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`loading-screen ${!loading ? "hidden" : ""}`}>
      <div className="loader"></div>
      <div className="loading-text">{loadingTexts[textIndex]}</div>
      <div className="audio-prompt">🔊 Click anywhere to enable audio</div>
    </div>
  );
}
