export function orbitHeightVh(count: number): number {
  return count > 0 ? (count + 1) * 100 : 150;
}

export function orbitPhase(progress: number, count: number) {
  if (count <= 0) return { index: -1, angle: 0, fade: 0 };
  const p = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  const units = Math.min(count, p * (count + 1));
  const index = Math.min(count - 1, Math.floor(units));
  const transition = Math.min(1, Math.max(0, (units - index) / .2));
  const eased = transition * transition * (3 - 2 * transition);
  const turn = index === 0 ? 0 : index - 1 + eased;
  return { index, angle: turn === 0 ? 0 : -turn * Math.PI * 2 / count, fade: index === 0 ? 1 : eased };
}
