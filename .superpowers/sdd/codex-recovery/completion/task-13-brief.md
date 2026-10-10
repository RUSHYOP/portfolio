## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 13: Integration, accessibility, performance and final release evidence

Run this gate only after Task 12’s persistence/admin/shared-token changes are complete. Its production build, end-to-end, accessibility, screenshots and performance evidence must describe the final post-change tree; earlier slice evidence does not substitute for this gate.

**Files:** Add `playwright.config.ts`, `tests/voyage.spec.ts` and package scripts/devDependencies if missing; optional `@axe-core/playwright` tooling; modify only confirmed defects; save `screenshots/voyage/slice-8/*`, `logs/`, `worklog.md`, `insights.md`.

**Interfaces:** Production server `http://127.0.0.1:3000`; use existing content read-only. Browser request interception prevents real inquiry delivery. Real WebGL/FPS review is separate from headless fallback assertions.

- [ ] Install only test tooling if absent: `npm install --save-dev @playwright/test @axe-core/playwright`; use installed version declarations and lockfile. Inspect the available browser binary; install Chromium with `npx playwright install chromium` if needed. Add scripts `test:e2e: "playwright test"`. Minimal configuration:

```ts
import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./tests",fullyParallel:false,use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"},projects:[{name:"desktop",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},{name:"mobile",use:{...devices["iPhone 13"],defaultBrowserType:"chromium",viewport:{width:390,height:844}}}],webServer:{command:"npm run start -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI}});
```

Build before running. Do not test development FPS and report it as production performance.

- [ ] Add integration test core:

```ts
import {test,expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem("voyage-ignition-played","1"));});
test("each rendered chapter is reachable and no removed rail target remains",async({page})=>{
 await page.goto("/");await expect(page.locator(".voyage-root")).toBeVisible();
 const ids=await page.locator(".voyage-track > section[id]").evaluateAll(nodes=>nodes.map(node=>node.id));
 for(const id of ids){
  const section=page.locator(`#${id}`);
  await section.evaluate((node,chapter)=>{const rect=node.getBoundingClientRect();const extra=chapter==="pilot"?rect.height*.55:chapter==="orbit"?innerHeight*.5:chapter==="worlds"?innerHeight*.75:0;window.scrollTo({top:rect.top+scrollY+extra,behavior:"instant"});},id);
  await expect(section).toBeInViewport();
  if(id==="jump")continue;
  if(id==="passage"){await section.evaluate(node=>window.scrollTo({top:node.getBoundingClientRect().top+scrollY+node.getBoundingClientRect().height*.5,behavior:"instant"}));continue;}
  const heading=section.locator("h1,h2,h3").first();await expect(heading).toBeVisible();await expect(heading).toBeInViewport();
  await expect.poll(()=>heading.evaluate(node=>{let opacity=1;for(let element:Element|null=node;element;element=element.parentElement)opacity*=Number(getComputedStyle(element).opacity);return opacity;})).toBeGreaterThan(.9);
  if(id==="landing"){await page.getByLabel("Name",{exact:true}).scrollIntoViewIfNeeded();await expect(page.getByLabel("Name",{exact:true})).toBeInViewport();await page.getByLabel("Name",{exact:true}).focus();await expect(page.getByLabel("Name",{exact:true})).toBeFocused();}
 }
 const targets=await page.locator(".rail__tick").count();expect(targets).toBe(ids.filter(id=>!["jump","passage"].includes(id)).length);
 expect(await page.locator("#voyage-canvas").count()).toBeLessThanOrEqual(1);
});
test("reduced motion exposes every process step and removes Jump",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");
 await expect(page.locator("#voyage-canvas")).toHaveCount(0);await expect(page.locator("#jump")).toHaveCount(0);
 await expect(page.locator(".process__reader")).toHaveCount(0);
 const process=page.locator("#orbit");if(await process.count()){await process.scrollIntoViewIfNeeded();expect(await process.locator("li article").count()).toBeGreaterThan(0);}
 await page.locator("#landing").scrollIntoViewIfNeeded();await expect(page.getByLabel("Email",{exact:true})).toBeVisible();
});
test("blocked WebGL preserves content",async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){if(String(args[0]).includes("webgl"))return null;return original.apply(this,args); } as typeof original;});
 await page.goto("/");await expect(page.locator(".voyage-root")).toHaveAttribute("data-tier","still");await page.locator("#landing").scrollIntoViewIfNeeded();await expect(page.getByLabel("Name",{exact:true})).toBeVisible();
});
test("inquiry success is tied to a successful intercepted response",async({page})=>{
 let requests=0;await page.route("**/api/inquiries",async route=>{requests++;await route.fulfill({status:201,contentType:"application/json",body:'{"ok":true}'});});
 await page.goto("/");await page.getByLabel("Name",{exact:true}).fill("Browser test");await page.getByLabel("Email",{exact:true}).fill("test@example.com");await page.getByLabel("What are you building?").fill("Test only; request intercepted.");await page.getByLabel("Budget range").selectOption("undecided");await page.getByLabel("Timeline",{exact:true}).selectOption("exploring");await page.getByRole("button",{name:"Send inquiry →"}).click();await expect(page.getByRole("status")).toContainText("SIGNAL RECEIVED");expect(requests).toBe(1);
});
test("keyboard and contrast audit has no serious/critical violations",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/");const report=await new AxeBuilder({page}).analyze();expect(report.violations.filter(v=>v.impact==="serious"||v.impact==="critical")).toEqual([]);
});
```

Resolve typing differences against installed Playwright APIs; no `any` suppressions. Add actual integration cases for context loss (`WEBGL_lose_context` when available), dock target→active rail, primary inquiry form without scheduler placeholders, unknown/unpublished case 404, no canvas on `/work/*` and `/admin`, Relaunch and keyboard project details.

- [ ] Add actual response/no-JS assertions: request `/` and confirm current CMS hero/process/body/form text in the server payload; open a browser context with `javaScriptEnabled:false`, verify the H1 and named inputs visibly render, and count each chapter ID once. Add keyboard tests to focus/scroll the active mobile Services panel with maximum copy, open/close the Process inline disclosure, navigate combined case/project controls and all Landing inputs in order. Inactive stacked/pinned panels must be excluded from keyboard/pointer access by visibility:hidden (the settled Services gate) or hidden/inert, and absent from Tab order; checking a section rectangle alone is insufficient.
- [ ] Fix the observed production-console defects recorded in `.playwright-mcp/console-2026-09-30T11-42-25-773Z.log`: inspect each rootlayout preload, remove the unsupported MIME `type` or use the browser-supported type for its actual resource (the existing `.otf` font preload should use `type="font/otf"`, not `font/opentype`). Let Next Image own image preloads where applicable; do not preload assets merely to silence warnings. Resolve favicon.ico404 using an existing real brand asset if available (copy/convert to a valid favicon or add metadata icon pointing to that asset); if none exists, record missing brand input instead of inventing a logo. Verify production network/console has no unsupported-preload warning or missing icon request. Distinguish Framer Motion's informational reduced-motion development message from application errors; do not suppress genuine errors to make the gate green.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Every unexpected failure must be fixed or explicitly block completion. Test logs must identify actual counts, not guessed counts. Check imports do not drag server/Mongoose code into client chunks. Verify no new console errors/hydration warnings in both routes.
- [ ] Capture production Lighthouse and performance traces at 1440×900 and a realistic mobile profile. Compare to recorded pre-redesign baseline if it exists; if no usable baseline exists, state comparison unavailable and record absolute results. Target LCP ≤2.5s, CLS <0.05, accessibility ≥95, high-tier desktop ≥55fps and mid-tier phone ≥45fps. Record hardware/browser, tier, DPR, throttling, measured frame counts and probe result. Browser emulation is not evidence of real mid-tier phone GPU performance. Missing hardware validation remains a named limitation, not a fabricated pass.
- [ ] Use Chrome performance/memory tools to profile all set pieces; fix only observed hot paths. No allocations in per-frame graph construction, no orphan event listeners or geometry after navigation, one context maximum. Confirm context-loss demotion cannot leave pins hiding content. Confirm focus pull applies to readability-critical panels without softening still mode; reuse Starfield's non-destructive max-combined control rather than clobbering external settings. Bloom remains absent unless real visual/perf evidence justifies the new compositor scope.
- [ ] Capture final screenshot sets at all content chapter entries, at least five intermediate positions, every case/process step, mobile menu, still, WebGL fallback, form error/success. Personally inspect images, not just file paths. Update final worklog with completed scopes, test evidence, metrics, outstanding mail/hardware/content dependencies. Commit `test: verify voyage launch accessibility and performance`.

## Common slice browser gate (Tasks 2, 6, 9; repeat after relevant fixes)

1. Run exact slice unit tests, typecheck and touched-file lint. Repository lint may retain the recorded baseline until Task 11. Start/reuse the documented local server.
2. Read automation tool documentation, open actual page, record tier and FPS probe. Capture 1440×900 and 390×844, ≥5 meaningful positions. Derive targets from actual section bounding rects/viewport holds, not raw old normalized percentages. Confirm scrollY has settled within 2px before captures.
3. Inspect screenshots for content/ring/planet alignment, crop, glass readability, no unintended amber, dock/controls overlap, heading/body typography, focus visibility and horizontal overflow. Retune numbers only from observed defects; rerun affected checks after edits.
4. Test keyboard/touch, 200% zoom, longest legal CMS text, empty optional data, reduced motion, WebGL disabled/lost and resizing midway. Do not overwrite real CMS data to create screenshots; temporary fixtures must be local, isolated, and removed before commit.
5. Confirm server routes, CMS edits and no unintended audio/messages. Save actual screenshots, logged tier/probe, console findings and deviations in worklog/insights. Finish the gate before progressing to next slice.

## Coverage and honest completion boundaries

- Implemented by plan: data-driven proof/process/quotes/projects; readable static alternatives; skip semantics across physical layout/camera/navigation; no reverse camera; real inquiry API integration; truthful Pilot; Surface relaunch; home launch; CMS invalidation; legacy removal; automated/browser/perf gates.
- External inputs still required for full product acceptance: verified published case studies/testimonials/credential copy; deployed DB/email settings; target-device performance evidence when unavailable locally.
- No new scheduler integration is in scope. Inquiry success sound follows actual stored-success response; receipt is not proof of a booked appointment or delivered email.
- Content-first SSR ships and is measured in Slice 4 before its visual gate; Slices 5–8 extend its one-DOM reservations and recheck server/no-JS content and CLS. No blank placeholder or unmeasured hydration counts as a pass.
- Original geometry is approved. No code is represented as a ThreeUI source port unless its source is actually read and attribution retained.

**Restored-design browser gate:** Use the original Claude glass/type/scene language: Orbit ring, case planets, quote belt and actual shared-technology graph remain planned subjects. Tune their framing and readability without substituting editorial service rows or removing motifs wholesale. Keep original camera never-reverse resolution, truthful data relationships, all-record still access, server-visible text and measured boundary tests.
