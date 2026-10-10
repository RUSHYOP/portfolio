## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 11: Launch at `/`, invalidate public content, and delete replaced code paths

**Files:** Modify `src/app/page.tsx`, `src/app/voyage/page.tsx`, `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/work/metadata.ts`, case reading page, collection specs, `src/components/motion/GlobalOverlays.tsx`, `src/hooks/useAudio.ts`, AudioEngine/synths, global/voyage CSS; create `src/components/FloatingAudioControls.tsx`; delete only the legacy component files whose inbound references are removed.

**Interfaces:** `/` is canonical voyage; `/voyage` stays a noindex preview alias with canonical `/`; `/work/[slug]` becomes indexable for published cases. `/projects`, `/admin`, APIs and media routes keep functioning. Settings edit already invalidates both roots; consulting collection edits must now invalidate `/` too.

- [ ] Replace `src/app/page.tsx` with the same server content composition as the completed preview route, preserving established prop names:

```tsx
import type {Metadata} from "next";
import {cache} from "react";
import {getVoyageContent,getProjects,getSkills} from "@/lib/data";
import VoyageRoot from "@/components/voyage/VoyageRoot";
import "./voyage/voyage.css";
export const revalidate=300;
const loadHome=cache(()=>Promise.all([getVoyageContent(),getProjects(),getSkills()]));
export async function generateMetadata():Promise<Metadata>{
 const [content]=await loadHome();
 const title=content.settings.heroHeadline.trim()||"Purav S";
 const description=content.settings.heroSubheadline.trim();
 return {title,description,alternates:{canonical:"/"},openGraph:{title,description,type:"website"}};
}
export default async function Home(){
 const [content,projects,skills]=await loadHome();
 return <VoyageRoot settings={content.settings} services={content.services} process={content.process} cases={content.caseStudies} testimonials={content.testimonials} projects={projects} skills={skills}/>;
}
```

Remove the generic portfolio title/description/openGraph defaults from root layout or replace its fallback with the already-approved truthful practice wording; home metadata uses actual CMS hero copy via request-scoped React cache, never invented achievements or endorsements. Preserve metadataBase, title template, locale and twitter card. Update `/voyage` metadata to `robots:{index:false,follow:false},alternates:{canonical:"/"}`. Keep its data composition consistent; extract shared server loader only if it avoids actual duplicate transformation, not a gratuitous wrapper. Existing `/work` return links become `/#worlds`, falling back `/#constellation` only when no published cases (a valid current study means Worlds exists). Remove its `noindex` metadata flag for published studies only; existing notFound pages remain 404. Add published slugs to sitemap using `getPublishedCaseStudySlugs` with its existing build DB-fallback policy.

- [ ] Update all four collection specs (`services.ts`, `processSteps.ts`, `caseStudies.ts`, `testimonials.ts`) to include `"/"` in `revalidate`, preserving `/voyage` and case page invalidation. Add table-driven collection test:

```ts
import {expect,it} from "vitest";
import {servicesDef} from "./services";
import {processStepsDef} from "./processSteps";
import {caseStudiesDef} from "./caseStudies";
import {testimonialsDef} from "./testimonials";
it.each([servicesDef,processStepsDef,caseStudiesDef,testimonialsDef])("invalidates the launched home for $name",definition=>{expect(definition.revalidate).toContain("/");expect(definition.revalidate).toContain("/voyage");});
```

Replace the existing exact expected arrays in `src/lib/collections/specs/specs.test.ts` as well: services `revalidate:["/", "/voyage"]`; caseStudies `revalidate:["/", "/voyage", "/work/[slug]"]`. Set process/testimonials to `["/", "/voyage"]`. Preserve case path type handling in the generic invalidation helper.

Create `src/lib/revalidatePortfolio.ts`:

```ts
import {revalidatePath} from "next/cache";
export function revalidatePortfolio(kind:"projects"|"skills") {
 revalidatePath("/");revalidatePath("/voyage");
 if(kind==="projects")revalidatePath("/projects");
}
```

Add its import and these exact success-path calls to **all six** mutation handlers, after successful persistence and any 404 guard, before returning success:

| Path/handler | Success insertion |
|---|---|
| `src/app/api/projects/route.ts` POST | after `await addProject(newProject)`: `revalidatePortfolio("projects");` |
| `src/app/api/projects/[id]/route.ts` PUT | after `if (!updated)` return: `revalidatePortfolio("projects");` |
| `src/app/api/projects/[id]/route.ts` DELETE | after `if (!deleted)` return: `revalidatePortfolio("projects");` |
| `src/app/api/skills/route.ts` POST | after `await addSkill(newSkill)`: `revalidatePortfolio("skills");` |
| `src/app/api/skills/[id]/route.ts` PUT | after `if (!updated)` return: `revalidatePortfolio("skills");` |
| `src/app/api/skills/[id]/route.ts` DELETE | after `if (!deleted)` return: `revalidatePortfolio("skills");` |

For both PUT handlers reject an empty editable patch before persistence. Project editable keys are `title,description,icon,technologies,liveLink,liveLinkLabel,codeLink,showLiveLink,showCodeLink,order`; skill keys are `name,icon,order`. Use `Object.fromEntries(Object.entries(body).filter(([key])=>editableKeys.includes(key)))`, run existing field validation on that patch, return 400 `{error:"No fields to update"}` if it is empty, and pass only the patch to update. First reject null/array/non-object bodies with 400 in both POST and PUT; never accidentally call Object.entries on null. Existing authorization/validation failures and not-found deletes must not invalidate.

Add `src/app/api/portfolioRevalidation.test.ts`:

```ts
import {beforeEach,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({auth:vi.fn(),revalidate:vi.fn(),addProject:vi.fn(),updateProject:vi.fn(),deleteProject:vi.fn(),addSkill:vi.fn(),updateSkill:vi.fn(),deleteSkill:vi.fn()}));
vi.mock("@/lib/auth",()=>({verifyRequest:mocks.auth}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("@/lib/data",()=>({getProjects:vi.fn(async()=>[]),getSkills:vi.fn(async()=>[]),addProject:mocks.addProject,updateProject:mocks.updateProject,deleteProject:mocks.deleteProject,addSkill:mocks.addSkill,updateSkill:mocks.updateSkill,deleteSkill:mocks.deleteSkill}));
import {POST as createProject} from "./projects/route";
import {PUT as updateProject,DELETE as deleteProject} from "./projects/[id]/route";
import {POST as createSkill} from "./skills/route";
import {PUT as updateSkill,DELETE as deleteSkill} from "./skills/[id]/route";
const request=(method:string,body?:unknown)=>new NextRequest("http://localhost/api/test",{method,...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
const context=()=>({params:Promise.resolve({id:"existing"})});
const mutations=[
 {kind:"projects",run:()=>createProject(request("POST",{title:"Actual title"}))},
 {kind:"projects",run:()=>updateProject(request("PUT",{title:"Changed"}),context())},
 {kind:"projects",run:()=>deleteProject(request("DELETE"),context())},
 {kind:"skills",run:()=>createSkill(request("POST",{name:"TypeScript"}))},
 {kind:"skills",run:()=>updateSkill(request("PUT",{name:"Changed"}),context())},
 {kind:"skills",run:()=>deleteSkill(request("DELETE"),context())},
];
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue(true);mocks.addProject.mockResolvedValue({id:"p"});mocks.updateProject.mockResolvedValue({id:"p"});mocks.deleteProject.mockResolvedValue(true);mocks.addSkill.mockResolvedValue({id:"s"});mocks.updateSkill.mockResolvedValue({id:"s"});mocks.deleteSkill.mockResolvedValue(true);});
it.each(mutations)("invalidates $kind only after success",async({kind,run})=>{expect((await run()).status).toBeLessThan(300);expect(mocks.revalidate.mock.calls.map(([path])=>path)).toEqual(kind==="projects"?["/","/voyage","/projects"]:["/","/voyage"]);});
it.each(mutations)("does not invalidate unauthorized $kind",async({run})=>{mocks.auth.mockResolvedValue(false);expect((await run()).status).toBe(401);expect(mocks.revalidate).not.toHaveBeenCalled();});
it("rejects empty/no-editable patches without writes or invalidation",async()=>{for(const body of [{},{id:"replacement"}]){expect((await updateProject(request("PUT",body),context())).status).toBe(400);expect((await updateSkill(request("PUT",body),context())).status).toBe(400);}expect(mocks.updateProject).not.toHaveBeenCalled();expect(mocks.updateSkill).not.toHaveBeenCalled();expect(mocks.revalidate).not.toHaveBeenCalled();});
it("does not invalidate missing records",async()=>{mocks.deleteProject.mockResolvedValue(false);mocks.updateSkill.mockResolvedValue(null);expect((await deleteProject(request("DELETE"),context())).status).toBe(404);expect((await updateSkill(request("PUT",{name:"x"}),context())).status).toBe(404);expect(mocks.revalidate).not.toHaveBeenCalled();});
```

- [ ] Create the audio-only controls and replace root import:

```tsx
"use client";
import AudioVisualizer from "./AudioVisualizer";
export default function FloatingAudioControls({muted,onToggleMute}:{muted:boolean;onToggleMute:()=>void}){
 return <div className="floating-controls"><button type="button" className="fc-btn" onClick={onToggleMute} aria-label={muted?"Enable ambient audio":"Mute ambient audio"} aria-pressed={!muted}>{muted?"◌":"♫"}</button><AudioVisualizer active={!muted}/></div>;
}
```

No auto-start: retain useAudio mute/gesture startup path. Set `<html lang="en" data-theme="dark">` in layout. Remove VoyageRoot's temporary theme-pinning effect and `engine.setTheme` call after removing the theme API. Remove EngineState.theme, class `setTheme`, the useAudio setTheme callback/return value, and light/dark pitch/filter branches; keep dark base `6000` in `setScrollEnergy`. Update initial EngineState snapshots/tests to `{muted:true,ready:false}`. Remove `playKeystroke` import, engine wrapper, synth function/export and corresponding tests only once callers are removed. Preserve all unrelated click/bell/ambient/visualizer code.

- [ ] Find inbound references before deletion:

```bash
rg -n 'PageClient|Navbar|ThemeToggle|TypewriterText|QuoteSection|ThreeBackground|CinematicIntro|playKeystroke|keystroke\(' src
rg -n 'from .*Projects|from .*Hero|from .*About|from .*Contact|from .*Footer' src
rg -n 'light|theme-preference|setTheme|prefers-color-scheme' src
```

Delete legacy `PageClient.tsx`, `Navbar.tsx`, `ThemeToggle.tsx`, `TypewriterText.tsx`, `QuoteSection.tsx`, `ThreeBackground.tsx`, and legacy Hero/About/Contact/Footer/Projects carousel components **after all inbound references are resolved**. Do not delete `src/app/projects/ProjectsClient.tsx` or CMS project/admin components sharing similar names. Remove obsolete CSS sections for these components, light-theme overrides, old scroll-progress bar on voyage routes, and typewriter animations. Any legacy component still used on another public route must be migrated to plain semantic content before deletion, not stranded as a broken import.

GlobalOverlays changes `isVoyage` to `pathname === "/" || pathname?.startsWith("/voyage")`; still exclude `/admin`, and keep scene absent on `/work/*`. No top progress strip on `/`. Existing standalone `/projects` can keep its ordinary progress indicator unless the user wants all public progress removed; this is distinct from the deleted top navigation.

- [ ] Preserve Slice 4's now-established content-first SSR contract. Do not reintroduce a tier-null empty root or hidden hero. Extend its pending reservation custom properties when adding variable chapter lengths (`worlds=(1.5*N+1)*100vh`, Belt 160vh, Passage 60vh, Constellation 180vh when present, Pilot 200vh, Landing at least 150vh, Surface default+tail). All chapters—including the inquiry form—must be in the server HTML exactly once. Intrinsic content taller than reservation must use accessible bounded internal scrolling while pending, so hydration does not shift downstream section boundaries. Reduced-motion CSS uses intrinsic static content from the first paint. Keep SceneRoot high/mid-only.

Run actual HTTP response/no-JS checks again at launch; require current hero, each authored body, and form inputs with no duplicate IDs. Record real buffered CLS at both target viewports and require <0.05. This is a regression gate on the concrete Slice 4 implementation, not a deferred architecture choice.

- [ ] Verify exact route/type/lint tests and production build. Run final `rg` searches; no live typewriter/keystroke/light-theme/top-Navbar/carousel code path may remain. Historical docs and screenshots may still contain those words; do not rewrite history. Fix the pre-existing 10 lint errors/6 warnings in their owning modules with narrowly scoped changes, not global disables. Commit `feat: launch voyage home and remove legacy experience`.
