"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import TypewriterText, { useInView } from "./TypewriterText";
import { renderFormatted } from "@/lib/format";

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
  const { ref: twRef, inView } = useInView(0.2);

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

  return (
    <section className="section" id="about" ref={sectionRef}>
      <div className="about-grid" ref={twRef as React.RefObject<HTMLDivElement>}>
        <div className="about-visual">
          <Image
            src={profileImage}
            alt="Purav S"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            priority
            unoptimized
          />
        </div>
        <div className="about-text">
          {aboutHeading && (
            <h3 className="about-heading">
              <TypewriterText text={aboutHeading} speed={40} trigger={inView} />
            </h3>
          )}
          {aboutText && aboutText.split("\n").filter(Boolean).map((paragraph, index) => (
            <p key={index}>{renderFormatted(paragraph)}</p>
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
                  unoptimized
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
