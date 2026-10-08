import { polar } from "./lib.js";

// Concentric rings. Port of the original draw loop (no fitting yet).
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
  overlap: 0,
  layout({ rings, symmetry, spacing, alternate, centerMode, radius }){
    const placements = [], groups = [], guides = [];
    if (centerMode === "emoji"){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
    }
    const ringSpacing = (spacing/100) * (radius / rings);
    for (let ring=1; ring<=rings; ring++){
      const r = ring * ringSpacing;
      const alt = alternate && ring % 2 === 0;
      const dir = alt ? -1 : 1;
      const offset = alt ? Math.PI/symmetry : 0;
      const scale = 1 - (ring-1)*0.03;
      const group = groups.length;
      groups.push({ size: symmetry, kind: "cycle", reverse: alt, ring });
      guides.push({ type: "circle", r });
      for (let s=0; s<symmetry; s++){
        const angle = dir * (s / symmetry) * Math.PI*2 + offset;
        const { x, y } = polar(r, angle);
        placements.push({ x, y, heading: angle, scale, group, index: s });
      }
    }
    return { placements, groups, guides };
  },
};
