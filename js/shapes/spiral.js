import { polar, fitFloor } from "./lib.js";

const CENTER_SCALE = 1.05;

// Seed i = 1..n at angle i·divergence, radius R·√(i/n) (Vogel's model).
function seedPoints(n, R, divergence){
  const a = divergence * Math.PI / 180;
  return Array.from({ length: n }, (_, k) => {
    const i = k + 1, angle = i * a;
    return { ...polar(R * Math.sqrt(i / n), angle), heading: angle };
  });
}

// Smallest distance between any two points (brute force; n ≤ 300).
function minDistance(P){
  let m = Infinity;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++){
    m = Math.min(m, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y));
  }
  return m;
}

export default {
  id: "spiral",
  label: "Phyllotaxis spiral",
  controls: [
    { key: "seeds",      label: "Seeds",      min: 40,  max: 300, step: 1,    default: 144,
      shuffle: [60, 260] },
    { key: "divergence", label: "Divergence", min: 137, max: 138, step: 0.05, default: 137.5,
      format: v => v.toFixed(2) + "°" },
    { key: "bands",      label: "Bands",      min: 1,   max: 5,   step: 1,    default: 3,
      shuffle: [2, 5] },
  ],
  alternate: null,
  maxEmoji: 6,
  overlap: 0,
  layout({ seeds, divergence, bands, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont);
    const need = floor * emojiSize * (1 - this.overlap);
    // Crowded: the most seeds (≤ `seeds`) that fit at the floor, same spiral
    // (spec §1 "Crowded groups"). Spacing scales like 1/√n: jump to the
    // estimate, then step up or down to the largest n that fits.
    let n = seeds, P = seedPoints(n, radius, divergence), d = minDistance(P);
    if (d < need){
      const fits = m => minDistance(seedPoints(m, radius, divergence)) >= need;
      n = Math.min(seeds - 1, Math.max(3, Math.floor(n * (d / need) ** 2)));
      while (n > 3 && !fits(n)) n--;
      while (n + 1 < seeds && fits(n + 1)) n++;
      P = seedPoints(n, radius, divergence); d = minDistance(P);
    }
    const scale = Math.max(floor, Math.min(1, d / (emojiSize * (1 - this.overlap))));

    const placements = [], groups = [];
    let kept = P;
    if (centerMode === "emoji"){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, group: 0, index: 0 });
      // Seeds that would touch the center emoji are dropped.
      const clear = emojiSize * (CENTER_SCALE + scale) / 2 * (1 - this.overlap);
      kept = P.filter(p => Math.hypot(p.x, p.y) >= clear);
    }
    // Bands: equal-count runs by seed index, i.e. equal-area annuli.
    const B = Math.min(bands, kept.length), g0 = groups.length;
    for (let b = 0; b < B; b++) groups.push({ size: 1, kind: "solid" });
    kept.forEach((p, k) => placements.push({
      x: p.x, y: p.y, heading: p.heading, scale, group: g0 + Math.floor(k * B / kept.length), index: 0,
    }));
    return { placements, groups };
  },
};
