"use client";

import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import TypewriterText from "./TypewriterText";
import { renderFormatted } from "@/lib/format";
import { getAudioEngine } from "@/lib/audio/AudioEngine";

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

const skillVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.05, type: "spring" as const, stiffness: 200, damping: 18 },
  }),
};

export default function About({ skills, profileImage, aboutHeading, aboutText }: AboutProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const twRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);

  const sectionInView = useInView(sectionRef, { amount: 0.1, once: true });
  const headingInView = useInView(twRef, { amount: 0.2, once: true });
  const skillsInView = useInView(skillsRef, { amount: 0.3, once: true });

  const handleSkillHover = (index: number) => {
    // Pitched click for melodic feedback across the row
    const pitch = 1 + (index % 7) * 0.08;
    getAudioEngine().click({ volume: 0.04, pitch });
  };

  return (
    <section className={`section${sectionInView ? " visible" : ""}`} id="about" ref={sectionRef}>
      <div className="about-grid" ref={twRef}>
        <motion.div
          className="about-visual"
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={sectionInView ? { clipPath: "inset(0 0% 0 0)" } : { clipPath: "inset(0 100% 0 0)" }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }}
        >
          <Image
            src={profileImage}
            alt="Profile photo of Purav S"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
            priority
          />
        </motion.div>
        <div className="about-text">
          {aboutHeading && (
            <h3 className="about-heading">
              <TypewriterText text={aboutHeading} speed={40} trigger={headingInView} />
            </h3>
          )}
          {aboutText && aboutText.split("\n").filter(Boolean).map((paragraph, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={headingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 + index * 0.12 }}
            >
              {renderFormatted(paragraph)}
            </motion.p>
          ))}
          <div className="skills-grid" aria-label="Skills" ref={skillsRef}>
            {skills.map((skill, i) => (
              <motion.div
                className="skill-item"
                key={skill.name}
                custom={i}
                variants={skillVariants}
                initial="hidden"
                animate={skillsInView ? "show" : "hidden"}
                whileHover={{ y: -4, scale: 1.04 }}
                onHoverStart={() => handleSkillHover(i)}
                data-cursor="hover"
              >
                <Image
                  src={skill.icon}
                  alt={skill.name}
                  width={32}
                  height={32}
                  className="skill-logo"
                />
                <span className="skill-name">{skill.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
