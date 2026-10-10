## Current authority — follow the original Claude plan

Latest user instruction: **“follow the claudes plan.”** The original approved Claude design is `docs/superpowers/specs/2026-09-14-voyage-redesign-design.md`; the recovered Claude Slice 3 execution plan is `docs/superpowers/plans/2026-09-18-voyage-slice-3.md`. This September 30 document is a **Codex-authored follow-on execution plan**, not a recovered Claude-authored plan. It implements that original approved design with reviewed engineering resolutions.

The editorial visual amendment introduced at `d0ffb8a` is superseded. Restore/retain the planned glass panels, shallow service arc, topology, hyperspace beat, original hero typography, capsule dock, telemetry, amber rail marker, orbital ring, case-study planets and shared-technology graph. Do not propagate the editorial service rows, velocity-only Jump or viewport-relative star framing from the detour. Tune for fidelity/readability within the approved design; do not substitute a new art direction. Data remains truthful: no invented case relationships, testimonials or credentials.

Retain valid engineering work: root-local measured physical/canonical mapping, content-first server/no-JS text, tier-gated ignition and SceneRoot, one WebGL context, programmatic navigation/audio suppression, idle velocity decay, dark-only audio, mobile focus trapping/Escape return, reduced-motion/WebGL fallback, text-zoom fixes and prefixed blur ordering. Never restore blank server markup to recover a visual effect. The current app restoration brief is `.superpowers/sdd/codex-recovery/claude-restoration-brief.md`; its task restores Slice 3 visuals before future chapter work. Continue the full remaining redesign after its review gate.

The user's explicit Resend choice remains binding: primary contact is the existing inquiry service, with no invented calendar/provider or new scheduler configuration. Original “Book a call” CTA language may request a call through that inquiry flow; it does not promise a booked appointment. “See the work” uses the real `/projects` reader until Worlds exists, then the retained Worlds target (or safe real fallback when empty).

### Task 10: Bound public resource use and close the recovered data/logging gaps

**Files:** Modify `src/lib/rateLimit.ts`, `src/app/api/logs/route.ts`, `src/lib/log.ts`, `src/lib/mail.ts`, project/skill GET routes; create `src/lib/readLimitedBody.ts`, `src/lib/voyageCasePreview.ts` and focused tests; extend existing `data.voyage` characterization tests. No new persistence-test infrastructure.

**Interfaces:** Limiter retains `check` and adds optional `maxKeys` plus read-only `size`; capacity rejects new keys rather than evicting live buckets and resetting abusers. Logs use 60 requests/minute per existing trusted client-IP boundary and a streamed 2048-byte cap. Voyage cases keep Item-compatible **preview** fields; full Markdown stays server-side on `/work/[slug]`.

- [ ] Write limiter cap/expiry test, run red, then replace limiter implementation:

```ts
interface Entry {count:number;resetAt:number}
export function createRateLimiter(opts:{max:number;windowMs:number;maxKeys?:number;now?:()=>number}){
 const now=opts.now??Date.now;const maxKeys=opts.maxKeys??10000;const hits=new Map<string,Entry>();
 return {
  get size(){return hits.size;},
  check(key:string):{allowed:boolean;retryAfterSec:number}{
   const t=now();
   // Fixed windows are inserted in reset-time order. Remove expired heads lazily;
   // no background timer and no full-map scan on every attacker key.
   while(hits.size){const first=hits.entries().next().value!;if(first[1].resetAt>t)break;hits.delete(first[0]);}
   const existing=hits.get(key);
   if(existing){if(existing.count>=opts.max)return {allowed:false,retryAfterSec:Math.max(1,Math.ceil((existing.resetAt-t)/1000))};existing.count++;return {allowed:true,retryAfterSec:0};}
   if(hits.size>=maxKeys){const first=hits.values().next().value!;return {allowed:false,retryAfterSec:Math.max(1,Math.ceil((first.resetAt-t)/1000))};}
   hits.set(key,{count:1,resetAt:t+opts.windowMs});return {allowed:true,retryAfterSec:0};
  }
 };
}
```

Add to `rateLimit.test.ts`:

```ts
it("caps new keys without resetting live limits, then evicts expired windows",()=>{let now=0;const limiter=createRateLimiter({max:1,windowMs:1000,maxKeys:2,now:()=>now});expect(limiter.check("a").allowed).toBe(true);expect(limiter.check("b").allowed).toBe(true);expect(limiter.check("c").allowed).toBe(false);expect(limiter.check("a").allowed).toBe(false);expect(limiter.size).toBe(2);now=1001;expect(limiter.check("c").allowed).toBe(true);expect(limiter.size).toBe(1);});
```

Existing fixed-window tests must stay green. This remains per-instance protection, not a distributed quota claim.

- [ ] Create streamed body helper and use it in logs before JSON parse:

```ts
export async function readLimitedBody(request:Request,maxBytes:number):Promise<string|null>{
 const declared=Number(request.headers.get("content-length"));if(Number.isFinite(declared)&&declared>maxBytes)return null;
 if(!request.body)return "";
 const reader=request.body.getReader();const decoder=new TextDecoder();let bytes=0;let text="";
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>maxBytes){await reader.cancel().catch(()=>{});return null;}text+=decoder.decode(chunk.value,{stream:true});}return text+decoder.decode();}
 finally{reader.releaseLock();}
}
```

In logs route import `createRateLimiter`, `clientIp`, `createHash` from node:crypto and this helper. Module-local `const limiter=createRateLimiter({max:60,windowMs:60000,maxKeys:10000});`. At POST start:

```ts
const key=createHash("sha256").update(clientIp(request)).digest("hex");
const limit=limiter.check(key);
if(!limit.allowed)return NextResponse.json({error:"Too many log requests"},{status:429,headers:{"Retry-After":String(limit.retryAfterSec)}});
const raw=await readLimitedBody(request,2048);
if(raw===null)return NextResponse.json({error:"Payload too large"},{status:413});
```

Replace old request.text/body-length block; preserve allowed event/object checks. Do not persist the rate key/IP. Add helper test with a chunked stream exceeding 2048, absent content-length, and multibyte text; require null and source cancellation. Logs route tests: first 60 allowed events→204, 61st→429 + Retry-After; oversize→413 without append; invalid event→400; append sink failure must not alter 204. Reset module/clock or mock limiter between cases so tests remain independent.

- [ ] Make appendLog's “never throws” promise true even when serialization or stdout fails. Replace its body:

```ts
export async function appendLog(name:string,record:Record<string,unknown>):Promise<void>{
 const safe=name.replace(/[^a-z0-9_-]/gi,"_");let line:string;
 try{line=JSON.stringify({name:safe,...record,ts:new Date().toISOString()})+"\n";}
 catch{line=JSON.stringify({name:safe,event:"serialization_failed",ts:new Date().toISOString()})+"\n";}
 try{await fs.mkdir(LOG_DIR,{recursive:true});await fs.appendFile(path.join(LOG_DIR,`${safe}.jsonl`),line,"utf8");}
 catch{try{console.log(line.trimEnd());}catch{/* Logging is best effort. */}}
}
```

In mail module add `const note=(record:Record<string,unknown>)=>Promise.resolve().then(()=>appendLog("inquiries",record)).catch(()=>{});` and replace every `await appendLog("inquiries", record)` inside `sendInquiryEmails` with `await note(record)`. This preserves the actual owner-send result even under a rejected/mocked logger. Logs route should also use `await Promise.resolve().then(()=>appendLog("client",record)).catch(()=>{});` so the endpoint contract survives an injected sink failure. Test circular record + fs reject + console throw resolves; test missing config with rejecting logger resolves `{sent:false}`; successful owner send plus rejecting logger still resolves `{sent:true}`. Never turn a stored inquiry into 500/retry due to a notification/logging tail.

- [ ] Project public case previews before crossing the client boundary. Create `src/lib/voyageCasePreview.ts`:

```ts
import type {Item} from "@/lib/collections/defineCollection";
import {readProof,excerpt} from "@/components/voyage/proof";
export function voyageCasePreview(item:Item):Item{
 const c=readProof(item);
 return {id:item.id,order:item.order,createdAt:item.createdAt,title:c.title,slug:c.slug,context:c.context,
  problem:excerpt(c.problem),architecture:excerpt(c.architecture),outcome:excerpt(c.outcome),
  diagram:c.diagram,stack:c.stack,metrics:c.metrics,planetFeature:c.feature};
}
```

In getVoyageContent return `caseStudies: cases.map(voyageCasePreview)` instead of full cases. This is Item-compatible and preserves the Worlds/combined graph interfaces, while full getCaseStudyBySlug stays unchanged. No internal/published bookkeeping or full 6000-character Markdown reaches the root. Extend already-created `data.voyage` characterization test to check publishedOnly remains true, ordering remains unchanged, and case body strings are ≤220 characters. Pure projection test:

```ts
it("keeps lightweight actual proof and drops full bodies/internal metadata",()=>{const item={id:"c",order:2,createdAt:"",title:"Real",slug:"real",problem:"x".repeat(6000),architecture:"y".repeat(6000),outcome:"z".repeat(6000),stack:["React"],ipHash:"private"};const preview=voyageCasePreview(item);expect(String(preview.problem).length).toBeLessThanOrEqual(220);expect(preview.stack).toEqual(["React"]);expect(preview.ipHash).toBeUndefined();expect(JSON.stringify(preview).length).toBeLessThan(1500);});
```

- [ ] Remove dead `CACHE_HEADERS` constants and `{headers:CACHE_HEADERS}` from both project and skill GET routes; next.config's `/api/*` no-store policy remains authoritative. Do not weaken API cache policy during a voyage task. Test GET route body unchanged and no contradictory public s-maxage declaration; browser network confirms no-store. `/api/media/*` caching is a distinct future optimization, not mixed into this change.
- [ ] Run limiter/logs/mail/public-reader/API unit tests, typecheck and touched lint. Each item above has a concrete failure gate: map never exceeds cap, stream never buffers beyond bound, no unbounded log writes per key, no full Markdown DTO, no misleading cache header, and logging/mail tail cannot reject successful storage. Commit `fix: harden public voyage data and logging paths`.
