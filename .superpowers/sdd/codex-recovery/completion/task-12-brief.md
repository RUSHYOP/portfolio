## Authoritative visual amendment — 2026-09-30

The user rejected the earlier visual result. Follow `.superpowers/sdd/codex-recovery/design-correction-brief.md` and its accepted restrained cinematic correction. An editorial foreground and meaningful real CMS content dominate. Do not default to equal glass cards; rings, planets and graphs are secondary sparse scene cues, with no invented project relationships. Decorative sample CSS, glass/blur prescriptions and old pinned-reader styling below are subordinate to the corrected tokens and composition. Visual review may simplify or decrease decoration. Keep pinned interaction only where a chapter needs it and all content remains accessible; Services uses intrinsic natural flow on every tier, authored order, no arc/150vh/card-strip treatment. Do not restore overlapping animated mobile service cards. Functional camera, data, navigation and accessibility contracts remain mandatory.

### Task 12: Finish the applicable recovered CMS ergonomics with focused tests

**Files:** `src/lib/collections/fieldSpec.ts`, `defineCollection.ts`, new `fieldDefaults.ts`; admin `CollectionTab.tsx`, `FieldInput.tsx`, `InboxTab.tsx`, `slugify.ts`, `page.tsx`; new `adminShortcut.ts`; new `src/lib/visualTokens.ts`, layout, StillSky, EnergyOrb and applicable styles. Keep this after the core public launch tasks. No new Mongo test service or unrelated admin redesign.

**Interfaces:** Optional number/select fields use empty string as a validated **unset sentinel**, translated to Mongo `$unset`, not stored as a string in a numeric path. An absent field uses its explicitly declared default if one exists; otherwise it remains blank. Required fields reject blank. Shared defaults never fabricate a select's first option.

- [ ] Create client-safe `fieldDefaults.ts` and use it in both collection schema/DTO and admin initial forms:

```ts
import type {FieldSpec,FieldValue} from "./fieldSpec";
export function declaredDefault(spec:FieldSpec):FieldValue|undefined{
 if(spec.default!==undefined)return Array.isArray(spec.default)?[...spec.default]:spec.default;
 if(spec.type==="chips")return [];
 if(spec.type==="toggle")return false;
 if(spec.type==="select"||spec.type==="number")return undefined;
 return "";
}
export function emptyField(spec:FieldSpec):FieldValue{return declaredDefault(spec)??"";}
```

Replace local `defaultFor` with imported `declaredDefault`, and `emptyFor` with `emptyField`; update comments about select options[0]/default numeric zero. In CollectionTab `emptyForm`, assign `f[k]=emptyField(s)` for each editable field. This keeps explicit defaults but stops inventing unselected select values or numeric zero.

- [ ] Implement unset end-to-end. In fieldSpec `checkField` before its switch add:

```ts
if(raw===""&&(spec.type==="number"||spec.type==="select")){
 return spec.required?{error:`${key} is required`}:{value:""};
}
```

Export this pure persistence adapter from `fieldSpec.ts`:

```ts
export function collectionPatch(fields:FieldSpecs,value:Record<string,FieldValue>){
 const set:Record<string,FieldValue>={};const unset:Record<string,1>={};
 for(const [key,v] of Object.entries(value)){
  const field=fields[key];
  if(v===""&&field&&!field.required&&(field.type==="number"||field.type==="select"))unset[key]=1;
  else set[key]=v;
 }
 return {...(Object.keys(set).length?{$set:set}:{}),...(Object.keys(unset).length?{$unset:unset}:{})};
}
```

In defineCollection.update pass `collectionPatch(fields,value)` in place of `{$set:value}`. In create derive `const stored=collectionPatch(fields,value).$set??{}` and spread `stored` instead of value; keep internal fields/order/id semantics. Clearing a declared default resets to that declared default on read; clearing an optional field without a default reads as blank. Do not broaden FieldValue to arbitrary null or silently coerce invalid numeric strings.

In FieldInput's number `onBlur` use:

```tsx
onBlur={()=>{if(numDraft!==null&&numDraft.trim()==="")onChange("");setNumDraft(null);}}
```

Blank required inputs now remain blank and fail shared validation rather than snapping back. Partial nonempty invalid numeric drafts still revert on blur; finite numbers retain current behavior. No NaN may enter form state.

- [ ] Remove hardcoded image key at both layers. Change FieldInput's `uploadFile` signature to `(file:File,field:string)=>Promise<string|null>` and its call to `uploadFile(file,name)`. CollectionTab passes `uploadFile={uploadFile}` instead of replacing the field with "diagram". Existing concrete MediaTab/ProjectsTab/SkillsTab upload categories remain unchanged. Test a synthetic image field named `portrait` passes `portrait` and a case field still passes `diagram`.

- [ ] Replace Inbox's hardcoded NEXT_STATUS with schema order:

```ts
const nextStatus=(current:string)=>{
 const index=STATUS_OPTIONS.findIndex(option=>option.value===current);
 return STATUS_OPTIONS[(index+1)%STATUS_OPTIONS.length]?.value??"";
};
```

Use `nextStatus(String(i.status))`; if no options exist disable the cycling action rather than posting an empty value. Test a reordered synthetic options array through an extracted `nextOption(current,options)` pure helper if needed; status values must come from schema, not a second record literal.

- [ ] Add `src/app/admin/components/adminShortcut.ts`:

```ts
export function shortcutIndex(event:Pick<KeyboardEvent,"key"|"metaKey"|"ctrlKey"|"altKey"|"shiftKey"|"target">,tabCount:number):number|null{
 if(!(event.metaKey||event.ctrlKey)||event.altKey||event.shiftKey||!/^[1-9]$/.test(event.key))return null;
 const target=event.target;
 if(target instanceof Element&&target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return null;
 const index=Number(event.key)-1;return index<Math.min(9,tabCount)?index:null;
}
```

In admin page onKey replace the lexicographic comparison branch with `const idx=shortcutIndex(e,TABS.length); if(idx!==null){e.preventDefault();switchTab(TABS[idx]);return;}`. Preserve Escape toast behavior. Update comment to Cmd/Ctrl 1–9; do not hijack editing shortcuts in forms, even if tab count grows past nine.

- [ ] Make slug typing and committed slug generation share normalization. Replace `slugify.ts` with:

```ts
export function constrainSlug(input:string):string{
 return input.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+/,"").slice(0,80);
}
export function slugify(input:string):string{return constrainSlug(input).replace(/-+$/,"");}
```

Delete FieldInput's private constrainSlug and import this function. Live trailing hyphen survives; blur removes trailing runs. Existing accents test (“Ça va — très bien”) and typed `foo-` behavior must both pass.

- [ ] Add shared amber token without changing its value:

```ts
// src/lib/visualTokens.ts
export const AMBER=0xf2b35c;
export const AMBER_CSS=`#${AMBER.toString(16).padStart(6,"0")}`;
```

Layout imports AMBER_CSS and sets html style `{{"--amber":AMBER_CSS} as CSSProperties}`. Remove local --amber definitions from voyage/work CSS; replace their literal amber uses with `var(--amber)` (use color-mix for transparent variants). EnergyOrb imports/re-exports AMBER so existing tests keep their interface. StillSky uses `fill={AMBER_CSS}`; Planet/Horizon new materials import AMBER. Horizon's shader color becomes a `uAmber` THREE.Color uniform instead of another RGB literal. Confirm screenshots remain pixel-equivalent in color; do not add amber to monochrome geometry.

- [ ] Focused tests before green:

```ts
// fieldDefaults/fieldSpec tests
expect(emptyField({type:"select",label:"Pick",options:[{value:"a",label:"A"}]})).toBe("");
expect(emptyField({type:"number",label:"Count"})).toBe("");
expect(emptyField({type:"number",label:"Count",default:3})).toBe(3);
const fields={count:{type:"number" as const,label:"Count"}};
expect(validate(fields,{count:""},"update")).toEqual({ok:true,value:{count:""}});
expect(collectionPatch(fields,{count:""})).toEqual({$unset:{count:1}});
expect(validate({count:{...fields.count,required:true}},{count:""},"update").ok).toBe(false);
// slug tests
expect(constrainSlug("Ça va — très bien-")).toBe("ca-va-tres-bien-");
expect(slugify("Ça va — très bien-")).toBe("ca-va-tres-bien");
```

Add jsdom user-event tests: clear optional number then blur emits "", clearing required field shows validation error; image upload forwards actual key; Cmd+9 on body selects tab9 with 12 tabs, Cmd+0/Cmd+10 do nothing, Cmd+2 inside input/textarea/select/contenteditable never switches; Inbox schema status cycle; missing stored select stays blank in `toDto`. Mock only the model boundary to assert update sends `$unset` and create omits the absent numeric path. Reuse the existing data.voyage reader characterization; test publishedOnly/order/DTO boundaries, not Mongo internals or a new heavyweight database harness.
- [ ] Run affected admin/collection tests, all unit tests, typecheck and clean lint. Brief browser-check edit/save/clear/upload/status/tab shortcuts and the unchanged amber on both voyage/work. Commit `fix: complete recovered CMS field and shortcut follow-ups`. Record closure of each ledger item in worklog; do not silently drop any deferred item or claim an unrun persistence integration suite.
