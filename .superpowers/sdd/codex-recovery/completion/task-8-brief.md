## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 8: Primary Resend-backed inquiry submission

**Files:** Create `src/components/voyage/Landing.tsx`, `Landing.test.tsx`; modify root/CSS only as needed. Reuse existing `/api/inquiries` and Resend mail service. No scheduler Settings/schema/admin/API additions, validator, provider iframe or empty scheduling column. No real booking URL is currently supplied. An already-existing verified booking link may remain secondary if discovered; do not invent or configure one.

**Interfaces:** `Landing({animated:boolean})`. Exact existing endpoint payload `{name,email,building,budget,timeline,website}`; no internal fields. The original “Book a call” CTA leads to this inquiry/call-request flow; submit says “Send inquiry”; success confirms receipt, not an appointment or unverified reply deadline.

- [ ] Add full Landing form implementation:

```tsx
"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {BUDGET_OPTIONS,TIMELINE_OPTIONS} from "@/lib/collections/specs/inquiries";
import {getAudioEngine} from "@/lib/audio/AudioEngine";
export default function Landing({animated}:{animated:boolean}){
 const [state,setState]=useState<"idle"|"sending"|"success"|"error">("idle");
 const [error,setError]=useState("");const busy=useRef(false);const request=useRef<AbortController|null>(null);
 const status=useRef<HTMLParagraphElement>(null);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 useEffect(()=>{if(state==="success"||state==="error")status.current?.focus();},[state]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current)return;busy.current=true;setState("sending");setError("");
  const form=event.currentTarget;const data=new FormData(form);
  const honeypot=form.elements.namedItem("website");
  if(honeypot instanceof HTMLInputElement)honeypot.value="";
  const payload={...Object.fromEntries(["name","email","building","budget","timeline"].map(key=>[key,String(data.get(key)??"")])),website:""};
  const body=JSON.stringify(payload);
  if(new TextEncoder().encode(body).length>4096){setError("Please shorten your message before sending.");setState("error");busy.current=false;return;}
  const controller=new AbortController();request.current=controller;
  const timeout=window.setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch("/api/inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body,signal:controller.signal});
   if(!response.ok){
    const retry=response.headers.get("Retry-After");
    throw new Error(response.status===429?`Too many attempts. Please try again${retry?` in ${retry} seconds`:" later"}.`:response.status===400?"Please check the form fields and try again.":"Your inquiry could not be sent. Please try again.");
   }
   if(!mounted.current)return;setState("success");form.reset();if(animated)getAudioEngine().bell({volume:.07});
  }catch(reason){
   if(!mounted.current)return;setError(reason instanceof Error&&reason.name!=="AbortError"?reason.message:"We could not confirm delivery. Please check your connection before trying again.");setState("error");
  }finally{window.clearTimeout(timeout);busy.current=false;request.current=null;}
 }
 return <section id="landing" className="chapter landing" aria-labelledby="landing-title">
  <div className="voyage-static"><p className="chapter__label">10 / LANDING</p><h2 id="landing-title">You’ve arrived. Let’s talk about what you’re building.</h2>
   <div className="landing__grid">
    <form className="glass landing__form" autoComplete="on" onSubmit={submit} aria-busy={state==="sending"}>
     <h3>Tell me what you’re building</h3>
     <label htmlFor="inquiry-name">Name</label><input id="inquiry-name" name="name" autoComplete="name" required maxLength={120}/>
     <label htmlFor="inquiry-email">Email</label><input id="inquiry-email" name="email" type="email" autoComplete="email" required maxLength={200}/>
     <label htmlFor="inquiry-building">What are you building?</label><textarea id="inquiry-building" name="building" required maxLength={2000} rows={6}/>
     <label htmlFor="inquiry-budget">Budget range</label><select id="inquiry-budget" name="budget" required defaultValue=""><option value="" disabled>Select a range</option>{BUDGET_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
     <label htmlFor="inquiry-timeline">Timeline</label><select id="inquiry-timeline" name="timeline" required defaultValue=""><option value="" disabled>Select a timeline</option>{TIMELINE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
     <div className="landing__honeypot" aria-hidden="true"><label htmlFor="inquiry-website">Website</label><input id="inquiry-website" name="website" type="text" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true"/></div>
     <button className="landing__submit" type="submit" disabled={state==="sending"}>{state==="sending"?"Sending…":"Send inquiry →"}</button>
     <p ref={status} tabIndex={-1} role={state==="error"?"alert":"status"}>{state==="success"?"Inquiry received. Thank you for getting in touch.":error}</p>
    </form>
   </div>
  </div>
 </section>;
}
```

Mount `<Landing animated={animated} />` in the ordered root. The form is prominent from the first server render.

The mounted ref prevents post-unmount state updates. An abort does not mean the server failed to store, so retain the cautious timeout message and never retry automatically. Use native constraint validation for required/email fields; retain input values on failure. Success only after HTTP 2xx for the human payload whose website is explicitly empty, never on click. The server’s bot/honeypot behavior remains unchanged; a browser autofill value is cleared only for this human form submission.

- [ ] Add failing/passing form tests using jsdom and mocked fetch. Required core:

```tsx
// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import Landing from "./Landing";
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});
function fill(){fireEvent.change(screen.getByLabelText("Name"),{target:{value:"Test"}});fireEvent.change(screen.getByLabelText("Email"),{target:{value:"test@example.com"}});fireEvent.change(screen.getByLabelText("What are you building?"),{target:{value:"A project"}});fireEvent.change(screen.getByLabelText("Budget range"),{target:{value:"undecided"}});fireEvent.change(screen.getByLabelText("Timeline"),{target:{value:"exploring"}});}
it("posts exact public fields and reports stored success",async()=>{const fetch=vi.fn().mockResolvedValue(new Response('{"ok":true}',{status:201}));vi.stubGlobal("fetch",fetch);render(<Landing animated={false}/>);fill();fireEvent.submit(screen.getByRole("button",{name:/Send inquiry/}).closest("form")!);await waitFor(()=>expect(screen.getByRole("status").textContent).toContain("Inquiry received"));const payload=JSON.parse(fetch.mock.calls[0][1].body);expect(Object.keys(payload).sort()).toEqual(["budget","building","email","name","timeline","website"]);expect(fetch.mock.calls[0][0]).toBe("/api/inquiries");});
it("retains input after a server failure",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response('{}',{status:500})));render(<Landing animated={false}/>);fill();fireEvent.submit(screen.getByRole("button",{name:/Send inquiry/}).closest("form")!);await screen.findByRole("alert");expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Test");});
```

Add these exact cases before the remaining form checks:

```tsx
it("clears unexpected browser autofill from the human honeypot payload",async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('{"ok":true}',{status:201}));vi.stubGlobal("fetch",fetch);
 render(<Landing animated={false}/>);fill();
 fireEvent.change(document.getElementById("inquiry-website")!,{target:{value:"autofilled.example"}});
 fireEvent.submit(screen.getByRole("button",{name:/Send inquiry/}).closest("form")!);
 await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());expect(JSON.parse(fetch.mock.calls[0][1].body).website).toBe("");
});
```

Also verify no iframe or scheduling placeholder is rendered, repeated submits while pending only call fetch once, and 429 produces useful retry copy. Reuse existing API POST tests for validation/storage/email failures; browser tests intercept POST and do not deliver mail.

- [ ] Add CSS and branch:

```css
.landing {min-height:150vh;background:radial-gradient(ellipse at 50% 100%,rgba(242,179,92,.06),transparent 55%);}
.landing__grid {display:grid;grid-template-columns:minmax(0,760px);gap:2rem;margin-top:3rem;}
.landing__form {padding:clamp(1.25rem,3vw,2.5rem);}
.landing__form {display:grid;gap:.75rem;order:-1;border-color:rgba(242,179,92,.35);}
.landing__form label {font-family:var(--font-jetbrains-mono);text-transform:uppercase;letter-spacing:.12em;font-size:.7rem;margin-top:.6rem;}
.landing__form input,.landing__form textarea,.landing__form select {width:100%;border:1px solid #444;background:#0a0a0a;color:white;border-radius:10px;padding:.8rem;font:inherit;}
.landing__form :focus-visible {outline:2px solid #f2b35c;outline-offset:3px;}
.landing__submit {background:#f2b35c;color:#000;border:0;border-radius:99px;padding:1rem;margin-top:1rem;font-family:var(--font-jetbrains-mono);}
.landing__submit:disabled {opacity:.6;}
.landing__honeypot {position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;}
@media(max-width:767px){.landing__grid{grid-template-columns:1fr}.landing{min-height:0}}
```

Run new form tests and existing inquiry API/mail tests, typecheck and touched lint. Commit `feat: connect primary Landing inquiry form`.
