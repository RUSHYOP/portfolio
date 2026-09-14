/**
 * Proximity-spring dock controller.
 * Ported from ThreeUI "Animated Top Dock" — topDockController.ts
 * (c) Meng To / DesignCode, MIT License, https://github.com/MengTo/threeui
 * Adapted: horizontal-only, no distribute/lockTrack modes, TS strictness.
 */

export interface DockOptions {
  proximity: number;
  spring: number;
  damping: number;
  widthGrowth: number;
  heightGrowth: number;
  drop: number;
}

interface ItemState {
  element: HTMLElement;
  baseWidth: number;
  baseHeight: number;
  value: number;
  velocity: number;
  target: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function createDockController(root: HTMLElement, getOptions: () => DockOptions): () => void {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisionQuery = window.matchMedia("(hover:hover) and (pointer:fine)");
  const items: ItemState[] = Array.from(root.querySelectorAll<HTMLElement>("[data-dock-item]")).map((element) => ({
    element, baseWidth: 0, baseHeight: 0, value: 0, velocity: 0, target: 0,
  }));

  let enabled = false;
  let pointerActive = false;
  let dirty = false;
  let frame = 0;
  let released = false;

  const canAnimate = () => !reducedQuery.matches && root.clientWidth > 0 && window.innerWidth > 600 && precisionQuery.matches;

  const measure = () => {
    enabled = canAnimate();
    for (const s of items) {
      s.element.style.width = "";
      s.element.style.height = "";
      s.element.style.transform = "";
      s.element.dataset.dockNear = "false";
    }
    for (const s of items) {
      const r = s.element.getBoundingClientRect();
      s.baseWidth = r.width;
      s.baseHeight = r.height;
      s.value = 0; s.velocity = 0; s.target = 0;
    }
    pointerActive = false;
    dirty = false;
    root.dataset.dockState = enabled ? "idle" : "static";
  };

  const setTargets = (clientX: number) => {
    if (!enabled) return;
    const { proximity } = getOptions();
    for (const s of items) {
      const r = s.element.getBoundingClientRect();
      const center = r.left + r.width * 0.5;
      const p = clamp(1 - Math.abs(clientX - center) / Math.max(1, proximity), 0, 1);
      const influence = p * p * (3 - 2 * p);
      s.target = influence;
      s.element.dataset.dockNear = influence > 0.08 ? "true" : "false";
    }
    pointerActive = true;
    dirty = true;
    root.dataset.dockState = "active";
  };

  const focusItem = (item: HTMLElement) => {
    if (!enabled) return;
    const index = items.findIndex((s) => s.element === item);
    if (index < 0) return;
    items.forEach((s, i) => {
      s.target = i === index ? 1 : Math.abs(i - index) === 1 ? 0.24 : 0;
      s.element.dataset.dockNear = s.target > 0.08 ? "true" : "false";
    });
    pointerActive = false;
    dirty = true;
    root.dataset.dockState = "focus";
  };

  const reset = () => {
    pointerActive = false;
    dirty = true;
    for (const s of items) {
      s.target = 0;
      s.element.dataset.dockNear = "false";
    }
  };

  const applyLayout = () => {
    const o = getOptions();
    for (const s of items) {
      const v = clamp(s.value, 0, 1.08);
      const extraW = Math.min(o.widthGrowth, s.baseWidth * 0.24);
      s.element.style.width = `${(s.baseWidth + extraW * v).toFixed(2)}px`;
      s.element.style.height = `${(s.baseHeight + o.heightGrowth * v).toFixed(2)}px`;
      s.element.style.transform = `translateY(${(v * o.drop).toFixed(2)}px)`;
    }
  };

  const draw = () => {
    if (enabled && dirty) {
      const o = getOptions();
      let moving = false;
      for (const s of items) {
        s.velocity += (s.target - s.value) * o.spring;
        s.velocity *= o.damping;
        s.value += s.velocity;
        if (Math.abs(s.target - s.value) < 0.001 && Math.abs(s.velocity) < 0.001) {
          s.value = s.target; s.velocity = 0;
        } else {
          moving = true;
        }
      }
      applyLayout();
      if (!moving) {
        dirty = false;
        if (items.every((s) => s.target === 0)) root.dataset.dockState = "idle";
      }
    }
    frame = requestAnimationFrame(draw);
  };

  const onPointerMove = (e: PointerEvent) => setTargets(e.clientX);
  const onWindowPointerMove = (e: PointerEvent) => {
    if (!pointerActive) return;
    const r = root.getBoundingClientRect();
    const bottom = Math.max(r.bottom, ...items.map((s) => s.element.getBoundingClientRect().bottom));
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > bottom) reset();
  };
  const onFocusIn = (e: FocusEvent) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-dock-item]");
    if (item) focusItem(item);
  };
  const onFocusOut = () => requestAnimationFrame(() => { if (!root.contains(document.activeElement)) reset(); });
  const onClick = () => reset();

  const remeasure = () => { if (!released) measure(); };
  document.fonts?.ready.then(remeasure);
  const ro = new ResizeObserver(remeasure);
  ro.observe(root.closest<HTMLElement>("[data-dock-frame]") ?? root.parentElement ?? root);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerleave", reset);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("click", onClick);
  window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
  reducedQuery.addEventListener("change", remeasure);
  precisionQuery.addEventListener("change", remeasure);
  measure();
  frame = requestAnimationFrame(draw);

  return () => {
    released = true;
    cancelAnimationFrame(frame);
    ro.disconnect();
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerleave", reset);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    root.removeEventListener("click", onClick);
    window.removeEventListener("pointermove", onWindowPointerMove);
    reducedQuery.removeEventListener("change", remeasure);
    precisionQuery.removeEventListener("change", remeasure);
  };
}
