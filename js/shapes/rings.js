import { polar, fitFloor, fitRing, fitGap } from "./lib.js";

const CENTER_SCALE = 1.05;
const OVERLAP = 0;

export default {
  id: "rings",
  label: "Concentric rings",
  controls: [
    { key: "rings",    label: "Rings",             min: 1,  max: 12,  step: 1, default: 6,
      shuffle: [3, 11] },
    { key: "symmetry", label: "Symmetry (spokes)", min: 3,  max: 24,  step: 1, default: 10,
      shuffle: [4, 21] },
    { key: "spacing",  label: "Ring spacing",      min: 50, max: 150, step: 1, default: 100,
      shuffle: [60, 149], format: v => (v/100).toFixed(1) + "×" },
  ],
  alternate: { label: "Stagger alternate rings", default: true },
  maxEmoji: 6,
  overlap: OVERLAP,
  layout({ rings, symmetry, spacing, alternate, centerMode, radius, emojiSize, minFont }){
    const overlap = OVERLAP;
    const floor = fitFloor(emojiSize, minFont);
    const placements = [], groups = [];
    const center = centerMode === "emoji";
    if (center){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, group: 0, index: 0 });
    }
    // Spacing: 1.0× spreads rings evenly from the center to `radius`. Below
    // 1.0× they pack toward the center; above, toward the edge (open center).
    const f = spacing / 100;
    let step = Math.min(f, 2 - f) * radius / rings;
    // Radial fit: rings never closer than an emoji at the floor scale.
    step = Math.max(step, emojiSize * floor * (1 - overlap));
    const gapCap = fitGap({ gap: step, emojiPx: emojiSize, overlap, floor });
    let inner = f > 1 ? Math.max(0, radius - rings * step) : 0;
    // Ring 1 vs the center emoji: shrink ring 1 first, then push rings out.
    let s1 = gapCap;
    if (center){
      s1 = Math.min(s1, fitGap({ gap: inner + step, emojiPx: emojiSize, overlap, other: CENTER_SCALE, floor }));
      const needC = emojiSize * (CENTER_SCALE + s1) / 2 * (1 - overlap);
      inner = Math.max(inner, needC - step);
    }
    for (let ring=1; ring<=rings; ring++){
      const r = inner + ring * step;
      if (r > radius) break;
      const base = Math.max(floor, 1 - (ring-1)*0.03);
      const cap = Math.min(base, gapCap, ring === 1 ? s1 : 1);
      // Crowded: a ring that can't hold its full symmetry is dropped, never
      // re-spaced with fewer emoji (spec §1 "Crowded groups").
      const fit = fitRing({ r, count: symmetry, emojiPx: emojiSize, overlap, floor });
      if (fit.count < symmetry) continue;
      const n = symmetry;
      const scale = Math.min(cap, fit.scale);
      const alt = alternate && ring % 2 === 0;
      const dir = alt ? -1 : 1;
      const offset = alt ? Math.PI/n : 0;
      const group = groups.length;
      groups.push({ size: n, kind: "cycle", reverse: alt });
      for (let s=0; s<n; s++){
        const angle = dir * (s / n) * Math.PI*2 + offset;
        const { x, y } = polar(r, angle);
        placements.push({ x, y, heading: angle, scale, group, index: s });
      }
    }
    return { placements, groups };
  },
};
