"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const skills = [
  { name: "JavaScript", logo: "/images/js.png" },
  { name: "Python", logo: "/images/python.png" },
  { name: "C Language", logo: "/images/c.png" },
  { name: "HTML", logo: "/images/html.png" },
  { name: "CSS", logo: "/images/css.png" },
  { name: "MySQL", logo: "/images/mysql.png" },
  { name: "Git", logo: "/images/gitbash.png" },
  { name: "Flask", logo: "/images/flask.png" },
  { name: "Machine Learning", logo: "/images/machinelearning.png" },
  { name: "Google Cloud Computing", logo: "/images/googlecloud.png" },
  { name: "Jenkins", logo: "/images/jenkins.png" },
];

const aboutParagraphs = [
  "I'm a Software Developer. Currently speed running through my final year in B.E Computer Science and Engineering.",
  "My skills include literally anything backend and basic machine learning integration. I enjoy writing code and building stuff that brings out the best in me.",
  "When I'm not coding, you can find me gaming, travelling, or just doing something dumb.",
];

export default function About() {
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
      const cards = document.querySelectorAll(".skill-item");
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
      if (target?.classList?.contains("skill-item")) {
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
    <section className="section" id="about" ref={sectionRef}>
      <h2 className="section-title" data-title="ABOUT">
        ABOUT
      </h2>
      <div className="about-grid">
        <div className="about-visual">
          <Image
            src="/images/purav.jpg"
            alt="Purav S"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
        <div className="about-text">
          <h3>Building Backend Systems</h3>
          {aboutParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <div className="skills-grid">
            {skills.map((skill) => (
              <div className="skill-item" key={skill.name}>
                <Image
                  src={skill.logo}
                  alt={skill.name}
                  width={32}
                  height={32}
                  className="skill-logo"
                />
                <span className="skill-name">{skill.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
