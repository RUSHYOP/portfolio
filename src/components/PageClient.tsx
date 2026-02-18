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

interface ProjectData {
  id: string;
  title: string;
  description: string;
  icon: string;
  technologies: string[];
  liveLink: string;
  liveLinkLabel: string;
  codeLink: string;
  showLiveLink: boolean;
  showCodeLink: boolean;
  order: number;
}

interface SkillData {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface PageClientProps {
  projects: ProjectData[];
  skills: SkillData[];
  profileImage: string;
  audioFile: string;
  githubUrl: string;
  linkedinUrl: string;
  xUrl: string;
  instagramUrl: string;
  resumeUrl: string;
  aboutHeading: string;
  aboutText: string;
}

export default function PageClient({ projects, skills, profileImage, audioFile, githubUrl, linkedinUrl, xUrl, instagramUrl, resumeUrl, aboutHeading, aboutText }: PageClientProps) {
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
        <source src={audioFile} type="audio/mpeg" />
      </audio>

      <ThreeBackground />
      <LoadingScreen loading={loading} />
      <Navbar visible={showNav} scrollTo={scrollTo} resumeUrl={resumeUrl} />
      <main id="main-content">
        <Hero glitchEffect={glitchEffect} onExplore={() => scrollTo("about")} />
        <About skills={skills} profileImage={profileImage} aboutHeading={aboutHeading} aboutText={aboutText} />
        <Projects projects={projects} />
        <Contact />
      </main>
      <Footer 
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        xUrl={xUrl}
        instagramUrl={instagramUrl}
        resumeUrl={resumeUrl}
      />
    </>
  );
}
