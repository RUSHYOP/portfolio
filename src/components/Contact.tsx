"use client";

import { useEffect, useRef } from "react";

export default function Contact() {
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

  return (
    <section className="section" id="contact" ref={sectionRef}>
      <h2 className="section-title" data-title="CONTACT">
        CONTACT ME
      </h2>
      <div className="contact-content">
        <div className="contact-info contact-info-centered">
          <h3>Let&apos;s create something amazing together</h3>
          <p>
            I&apos;m always interested in new opportunities and exciting projects.
            Whether you have a question or just want to say hi, I&apos;ll try my best
            to get back to you!
          </p>
          <div className="contact-details">
            <a
              href="mailto:puravshrinavalan@gmail.com"
              className="contact-item contact-email-link"
            >
              puravshrinavalan@gmail.com
            </a>
            <div className="contact-item">Bangalore, India</div>
          </div>
        </div>
      </div>
    </section>
  );
}
