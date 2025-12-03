"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import LoadingScreen from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), {
  ssr: false,
});

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const initializeAudio = useCallback(() => {
    if (audioRef.current && !audioInitialized) {
      audioRef.current.volume = 0.05;
      audioRef.current.play().catch(() => {
        // Audio autoplay blocked, will try on user interaction
      });
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  useEffect(() => {
    const handleInteraction = () => {
      initializeAudio();
    };

    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
  }, [initializeAudio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => {
        setShowNav(true);
      }, 1000);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 200);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const scrollTo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const navHeight = 80;
      const targetPosition = element.offsetTop - navHeight;
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <audio ref={audioRef} loop preload="auto" style={{ display: "none" }}>
        <source src="/audio/space.mp3" type="audio/mpeg" />
        <source src="/audio/space.ogg" type="audio/ogg" />
        <source src="/audio/space.wav" type="audio/wav" />
      </audio>

      <ThreeBackground />
      <LoadingScreen loading={loading} />
      <Navbar visible={showNav} scrollTo={scrollTo} />
      <Hero glitchEffect={glitchEffect} onExplore={() => scrollTo("about")} />
      <About />
      <Projects />
      <Contact />
      <Footer />
    </>
  );
}
