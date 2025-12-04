"use client";

import { useEffect, useRef } from "react";

const projects = [
  {
    title: "PulseAI: Heart Health Monitor",
    description:
      "Developing a machine learning-powered smartwatch prototype for heart health monitoring with GSM alerts, real-time cloud sync, and anomaly detection algorithms.",
    icon: "💓",
    technologies: ["Python", "Machine Learning", "IoT", "Cloud Sync"],
  },
  {
    title: "ProcSAGE - Host Threat Detection",
    description:
      "Python-based ML model to detect anomalies in system calls for enhanced endpoint security. Published at IEEE ESCI 2025 conference.",
    icon: "🔒",
    technologies: ["Python", "Machine Learning", "Cybersecurity"],
    liveLink: "https://ieeexplore.ieee.org/document/10988235",
    liveLinkLabel: "Paper Publication",
    codeLink: "https://github.com/RUSHYOP/Procsage",
  },
  {
    title: "FinAI - NLP Financial Chatbot",
    description:
      "Built a finance-focused chatbot for Google Dev Solution Challenge using Python and Flask Framework. Provides market-based recommendations with legal insights.",
    icon: "💰",
    technologies: ["Python", "Flask", "NLP", "Google Cloud"],
    codeLink: "https://github.com/RUSHYOP/FinAI",
  },
  {
    title: "PigGame Backend System",
    description:
      "Developed the backend for a two-player dice-based game using JavaScript. Implemented Fisher-Yates shuffle algorithm for fair and human-like dice rolls.",
    icon: "🎲",
    technologies: ["HTML", "CSS", "JavaScript", "Game Logic", "Algorithms"],
    liveLink: "https://piggame.rushy.dev/",
    codeLink: "https://github.com/RUSHYOP/pig-game",
  },
  {
    title: "Disease Prediction AI System",
    description:
      "Built an AI chatbot using Python and Gradio to assess risks of Parkinson's disease using symptom inputs. Focused on early diagnosis support.",
    icon: "🏥",
    technologies: ["Python", "Gradio", "AI/ML"],
    liveLink: "https://huggingface.co/spaces/Rushyy/parkinsons",
    codeLink: "https://github.com/RUSHYOP/Parkinson-s-predictor",
  },
  {
    title: "SecureVault: Local Password Manager",
    description:
      "On a personal quest, built a local storage based password system. It manipulates JSONs. Stores passwords in groups.",
    icon: "🔓",
    technologies: ["HTML", "CSS", "JavaScript"],
    liveLink: "https://passwordmanager.rushy.dev/",
    codeLink: "https://github.com/RUSHYOP/password-manager",
  },
  {
    title: "MazeSolver: Maze Gen and Maze Path",
    description:
      "Built a maze generator and maze solver with path visualization using DFS and BFS searching algorithms",
    icon: "🧩",
    technologies: ["Python", "Algorithms", "Data Structures"],
    liveLink: "https://huggingface.co/spaces/Rushyy/mazesolver",
    codeLink: "https://github.com/RUSHYOP/mazesolver",
  },
  {
    title: "To Do List App",
    description:
      "Developed a ToDo List application as part of my academia showing data structure skills.",
    icon: "📝",
    technologies: ["Python", "Data Structures"],
    codeLink: "https://github.com/RUSHYOP/todolist",
  },
];

export default function Projects() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll(".project-card");
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        if (
          x >= 0 &&
          x <= rect.width &&
          y >= 0 &&
          y <= rect.height
        ) {
          const rotateX = (y - centerY) / 10;
          const rotateY = (centerX - x) / 10;
          (card as HTMLElement).style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
        }
      });
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.classList?.contains("project-card")) {
        target.style.transform = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave, true);
    };
  }, []);

  return (
    <section className="section" id="projects" ref={sectionRef}>
      <h2 className="section-title" data-title="PROJECTS">
        PROJECTS
      </h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div className="project-card" key={project.title}>
            <div className="project-visual">{project.icon}</div>
            <div className="project-info">
              <h3 className="project-title">{project.title}</h3>
              <p className="project-desc">{project.description}</p>
              <div className="project-tech">
                {project.technologies.map((tech) => (
                  <span className="tech-tag" key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
              <div className="project-links">
                {project.liveLink && (
                  <a
                    href={project.liveLink}
                    className="project-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.liveLinkLabel || "Live Demo"}
                  </a>
                )}
                {project.codeLink && (
                  <a
                    href={project.codeLink}
                    className="project-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Github
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
