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
import { FloatingControls } from "@/components/ThemeToggle";

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
  const [muted, setMuted] = useState(true);
  const [showBg, setShowBg] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play/pause background audio based on muted state (user-initiated only)
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.05;
    if (muted) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [muted]);

  // Show nav after hero typewriter finishes (~3s), defer Three.js until after LCP
  useEffect(() => {
    const navTimer = setTimeout(() => setShowNav(true), 3000);
    const bgTimer = setTimeout(() => setShowBg(true), 3500);
    return () => { clearTimeout(navTimer); clearTimeout(bgTimer); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 200);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const navHeight = 80;
      const targetPosition = element.offsetTop - navHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  const handleExplore = () => {
    if (muted) setMuted(false);
    scrollTo("about");
  };

  const toggleMute = () => setMuted((prev) => !prev);

  return (
    <>
      <audio ref={audioRef} loop preload="none" style={{ display: "none" }}>
        <source src={settings.audioFile} type="audio/mpeg" />
      </audio>

      {showBg && <ThreeBackground />}
      <Navbar visible={showNav} showNavbar={settings.showNavbar} scrollTo={scrollTo} navLinks={settings.navLinks} />
      <main id="main-content">
        <Hero glitchEffect={glitchEffect} onExplore={handleExplore} showButton={settings.showHeroButton} muted={muted} />
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

      <FloatingControls muted={muted} onToggleMute={toggleMute} />
    </>
  );
}
