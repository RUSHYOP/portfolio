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
}

export default function PageClient({ projects: initialProjects, skills: initialSkills, profileImage: initialProfileImage, audioFile: initialAudioFile, githubUrl: initialGithubUrl, linkedinUrl: initialLinkedinUrl, xUrl: initialXUrl, instagramUrl: initialInstagramUrl, resumeUrl: initialResumeUrl }: PageClientProps) {
  const [loading, setLoading] = useState(true);
  const [showNav, setShowNav] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Client-side data state for live updates
  const [projects, setProjects] = useState(initialProjects);
  const [skills, setSkills] = useState(initialSkills);
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [audioFile, setAudioFile] = useState(initialAudioFile);
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [xUrl, setXUrl] = useState(initialXUrl);
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl);
  const [resumeUrl, setResumeUrl] = useState(initialResumeUrl);

  const initializeAudio = useCallback(() => {
    if (audioRef.current && !audioInitialized) {
      audioRef.current.volume = 0.05;
      audioRef.current.play().catch(() => {
        // Audio autoplay blocked, will try on user interaction
      });
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  // Fetch data updates periodically
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, skillsRes, settingsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/skills"),
          fetch("/api/settings"),
        ]);

        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData);
        }

        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          setSkills(skillsData);
        }

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setProfileImage(settingsData.profileImage);
          setAudioFile(settingsData.audioFile);
          setGithubUrl(settingsData.githubUrl);
          setLinkedinUrl(settingsData.linkedinUrl);
          setXUrl(settingsData.xUrl);
          setInstagramUrl(settingsData.instagramUrl);
          setResumeUrl(settingsData.resumeUrl);
        }
      } catch (error) {
        console.error("Failed to fetch updates:", error);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, []);

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

  // Update audio source only when it changes
  useEffect(() => {
    if (audioRef.current && audioRef.current.src !== audioFile) {
      const wasPlaying = !audioRef.current.paused;
      const currentTime = audioRef.current.currentTime;
      audioRef.current.src = audioFile;
      if (wasPlaying && audioInitialized) {
        audioRef.current.currentTime = currentTime;
        audioRef.current.play().catch(() => {});
      }
    }
  }, [audioFile, audioInitialized]);

  return (
    <>
      <audio ref={audioRef} loop preload="auto" style={{ display: "none" }}>
        <source src={initialAudioFile} type="audio/mpeg" />
      </audio>

      <ThreeBackground />
      <LoadingScreen loading={loading} />
      <Navbar visible={showNav} scrollTo={scrollTo} resumeUrl={resumeUrl} />
      <main id="main-content">
        <Hero glitchEffect={glitchEffect} onExplore={() => scrollTo("about")} />
        <About skills={skills} profileImage={profileImage} />
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
