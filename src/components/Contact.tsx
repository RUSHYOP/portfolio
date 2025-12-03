"use client";

import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    emailjs.init("uDaAI7fxd_8iOS2rm");
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.name && form.email && form.subject && form.message) {
      setIsSubmitting(true);

      try {
        await emailjs.send("service_6tjprnp", "template_xer91le", {
          from_name: form.name,
          from_email: form.email,
          subject: form.subject,
          message: form.message,
          to_email: "alwayspurav@gmail.com",
        });

        alert(
          `Thank you, ${form.name}! Your message has been sent successfully. I'll get back to you soon!`
        );

        setForm({ name: "", email: "", subject: "", message: "" });
      } catch (error) {
        console.error("Failed to send email:", error);
        alert(
          "Sorry, there was an error sending your message. Please try again or email me directly at alwayspurav@gmail.com"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <section className="section" id="contact" ref={sectionRef}>
      <h2 className="section-title" data-title="CONTACT">
        CONTACT ME
      </h2>
      <div className="contact-grid">
        <div className="contact-info">
          <h3>Let&apos;s create something amazing together</h3>
          <p>
            I&apos;m always interested in new opportunities and exciting projects.
            Whether you have a question or just want to say hi, I&apos;ll try my best
            to get back to you!
          </p>
          <div className="contact-details">
            <div className="contact-item">alwayspurav@gmail.com</div>
            <div className="contact-item">Bangalore, India</div>
          </div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="subject" className="form-label">Subject</label>
            <input
              id="subject"
              type="text"
              className="form-input"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message" className="form-label">Message</label>
            <textarea
              id="message"
              className="form-textarea"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <button type="submit" className="form-submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}
