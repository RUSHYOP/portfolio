"use client";

import { useRef, useState } from "react";
import {
  BUDGET_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/lib/collections/specs/inquiries";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "pending" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    setState("pending");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "Too many messages. Please try again later, or email me directly."
            : "Your message couldn’t be saved. Please try again or email me directly.",
        );
      setState("success");
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "The response took too long. Your message may have arrived; please email me before trying again."
          : err instanceof Error
            ? err.message
            : "Couldn’t send. Please email me directly.",
      );
      setState("error");
    } finally {
      clearTimeout(timer);
      submitting.current = false;
    }
  }
  return (
    <form
      className="contact-form"
      action="/api/inquiries"
      method="post"
      onSubmit={submit}
      aria-label="Project inquiry"
    >
      <div className="form-row">
        <label>
          Your name
          <input
            required
            name="name"
            autoComplete="name"
            maxLength={120}
            placeholder="Alex Morgan"
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            maxLength={200}
            placeholder="alex@company.com"
          />
        </label>
      </div>
      <label>
        A little about your idea
        <textarea
          required
          name="building"
          rows={3}
          maxLength={2000}
          placeholder="What are you working on, and where can I help?"
        />
      </label>
      <div className="form-row">
        <label>
          Budget
          <select name="budget" defaultValue="undecided">
            {BUDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Timeline
          <select name="timeline" defaultValue="exploring">
            {TIMELINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="form-bottom">
        <span>Have a question? That’s welcome too.</span>
        <button
          className="button button-light"
          disabled={state === "pending" || state === "success"}
        >
          {state === "pending" ? (
            "Sending…"
          ) : state === "success" ? (
            "Message received ✓"
          ) : (
            <>
              Send inquiry <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
      </div>
      <div
        aria-live="polite"
        role="status"
        className={`form-status ${state === "error" ? "form-error" : ""}`}
      >
        {state === "success"
          ? "Thanks for reaching out. Your message is saved, and I’ll get back to you by email."
          : state === "error"
            ? error
            : ""}
      </div>
      <noscript>
        <p>
          The form needs JavaScript. You can reach me directly at{" "}
          <a href="mailto:puravshrinavalan@gmail.com">
            puravshrinavalan@gmail.com
          </a>
          .
        </p>
      </noscript>
    </form>
  );
}
