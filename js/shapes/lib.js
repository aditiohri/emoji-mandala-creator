export function polar(r, angle){
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

// Smallest scale any fitted placement may have (spec §3 Fitting).
export const MIN_SCALE = 0.55;
export function fitFloor(emojiSize, minFont){
  return Math.max(MIN_SCALE, minFont / emojiSize);
}

// Distance between neighbours when `count` points are evenly spaced on radius r.
export function chord(r, count){
  return 2 * r * Math.sin(Math.PI / count);
}

// Evenly spaced ring: shrink to fit; below `floor`, keep `floor` and re-space
// with fewer points. count 0 means the ring is dropped (fewer than 3 fit).
export function fitRing({ r, count, emojiPx, overlap, floor }){
  const need = emojiPx * (1 - overlap);
  const scale = Math.min(1, chord(r, count) / need);
  if (scale >= floor) return { count, scale };
  let m = count;
  while (m >= 3 && chord(r, m) < floor * need) m--;
  return { count: m >= 3 ? m : 0, scale: floor };
}

// Largest scale s (≤ 1) for a group whose neighbour across a radial gap has
// scale `other` (default: the same scale s). Never below `floor`; callers check
// `gap` against the need at `floor` and move groups apart when it fails.
export function fitGap({ gap, emojiPx, overlap, other, floor }){
  const unit = gap / (emojiPx * (1 - overlap));
  const s = other === undefined ? unit : 2 * unit - other;
  return Math.max(floor, Math.min(1, s));
}
