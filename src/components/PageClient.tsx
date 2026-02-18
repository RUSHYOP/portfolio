"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import QuoteSection from "@/components/QuoteSection";
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

interface NavLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: { label: string; url: string }[];
}

interface PageClientProps {
  projects: ProjectData[];
  skills: SkillData[];
  settings: {
    profileImage: string;
    audioFile: string;
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
    showNavbar: boolean;
    navLinks: NavLink[];
    footerSections: FooterSection[];
  };
}

export default function PageClient({ projects, skills, settings }: PageClientProps) {
  const [showNav, setShowNav] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  useEffect(() => {
    if (audioRef.current && !audioInitialized) {
      audioRef.current.volume = 0.05;
      audioRef.current.play().catch(() => {});
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  // Show nav after hero typewriter finishes (~3s)
  useEffect(() => {
    const timer = setTimeout(() => setShowNav(true), 3000);
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
      if (e.key === "Escape") window.scrollTo({ top: 0, behavior: "smooth" });
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
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  return (
    <>
      <audio ref={audioRef} loop preload="auto" style={{ display: "none" }}>
        <source src={settings.audioFile} type="audio/mpeg" />
      </audio>

      <ThreeBackground />
      <Navbar visible={showNav} showNavbar={settings.showNavbar} scrollTo={scrollTo} navLinks={settings.navLinks} />
      <main id="main-content">
        <Hero glitchEffect={glitchEffect} onExplore={() => scrollTo("about")} showButton={settings.showHeroButton} />
        <QuoteSection quote={settings.quote1} />
        <About skills={skills} profileImage={settings.profileImage} aboutHeading={settings.aboutHeading} aboutText={settings.aboutText} />
        <QuoteSection quote={settings.quote2} />
        <Projects projects={projects} projectsTitle={settings.projectsTitle} />
        <Contact
          contactHeading={settings.contactHeading}
          contactText={settings.contactText}
          contactEmail={settings.contactEmail}
          contactLocation={settings.contactLocation}
        />
      </main>
      <Footer footerSections={settings.footerSections} />
    </>
  );
}
