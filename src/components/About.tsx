"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

interface SkillData {
  id: string;
  name: string;
  icon: string;
  order: number;
}

interface AboutProps {
  skills: SkillData[];
  profileImage: string;
  aboutHeading: string;
  aboutText: string;
}

export default function About({ skills, profileImage, aboutHeading, aboutText }: AboutProps) {
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
      <div className="about-grid">
        <div className="about-visual">
          <Image
            src={profileImage}
            alt="Purav S"
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
        <div className="about-text">
          {aboutHeading && <h3>{aboutHeading}</h3>}
          {aboutText && aboutText.split("\n").filter(Boolean).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <div className="skills-grid">
            {skills.map((skill) => (
              <div className="skill-item" key={skill.name}>
                <Image
                  src={skill.icon}
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
