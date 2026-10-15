"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import QuoteSection from "@/components/QuoteSection";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { FloatingControls } from "@/components/ThemeToggle";
import { useAudio } from "@/hooks/useAudio";

const ThreeBackground = dynamic(() => import("@/components/ThreeBackground"), { ssr: false });
const CinematicIntro = dynamic(() => import("@/components/motion/CinematicIntro"), { ssr: false });

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
  const [showBg, setShowBg] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const { engine, state, toggleMuted } = useAudio();

  // Register background URL with the audio engine
  useEffect(() => {
    if (settings.audioFile) engine.setBackgroundUrl(settings.audioFile);
  }, [engine, settings.audioFile]);

  // Stage the UI after intro completes
  useEffect(() => {
    if (!introDone) return;
    const navTimer = setTimeout(() => setShowNav(true), 100);
    const bgTimer = setTimeout(() => setShowBg(true), 250);
    return () => {
      clearTimeout(navTimer);
      clearTimeout(bgTimer);
    };
  }, [introDone]);

  // Scroll-velocity → audio filter cutoff (only when unmuted)
  const lastScrollRef = useRef({ y: 0, t: 0 });
  useEffect(() => {
    if (state.muted) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastScrollRef.current.y);
      const dt = Math.max(1, now - lastScrollRef.current.t);
      const energy = Math.min(1, dy / dt / 2); // px/ms normalized
      engine.setScrollEnergy(energy);
      lastScrollRef.current = { y: window.scrollY, t: now };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, state.muted]);

  const scrollTo = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const navHeight = 80;
      const targetPosition = element.offsetTop - navHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  }, []);

  const handleExplore = useCallback(() => {
    if (state.muted) {
      // First interaction also unmutes
      void engine.setMuted(false);
    }
    engine.impact();
    setTimeout(() => scrollTo("about"), 200);
  }, [engine, state.muted, scrollTo]);

  return (
    <>
      {!introDone && <CinematicIntro onComplete={() => setIntroDone(true)} />}

      {showBg && <ThreeBackground />}
      <Navbar visible={showNav} showNavbar={settings.showNavbar} scrollTo={scrollTo} navLinks={settings.navLinks} />
      <main id="main-content">
        <Hero onExplore={handleExplore} showButton={settings.showHeroButton} />
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

      <FloatingControls muted={state.muted} onToggleMute={toggleMuted} />
    </>
  );
}
