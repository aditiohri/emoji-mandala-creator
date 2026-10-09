import { polar, fitFloor, fitRing, petalCurve } from "./lib.js";

const CENTER_SCALE = 1.05;
const OVERLAP = 0.15;

// One petal on axis angle 0, as units of points { r, phi }: the tip first,
// then each pair of side points from the tip down to the base, `step` apart
// along the outline. A unit is kept or dropped whole, so petals stay
// mirror-symmetric.
function outline(B, T, phiMax, step){
  const curve = petalCurve(B, T, phiMax), N = 400, arc = [0];
  let prev = polar(B, curve(0).phi);
  for (let i = 1; i <= N; i++){
    const q = curve(i / N), p = polar(q.r, q.phi);
    arc.push(arc[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const m = Math.max(1, Math.floor(arc[N] / step)), units = [[{ r: T, phi: 0 }]];
  for (let s = m - 1; s >= 0; s--){
    const q = curve(arc.findIndex(a => a >= arc[N] * s / m - 1e-9) / N);
    units.push([{ r: q.r, phi: q.phi }, { r: q.r, phi: -q.phi }]);
  }
  return units;
}

// A petal too narrow for two sides: the tip, then emoji down its axis.
function spoke(B, T, step){
  const units = [[{ r: T, phi: 0 }]];
  for (let r = T - step; r >= B - 1e-9; r -= step) units.push([{ r, phi: 0 }]);
  return units;
}

export default {
  id: "lotus",
  label: "Lotus",
  controls: [
    { key: "layers", label: "Layers",       min: 1,  max: 3,  step: 1, default: 2 },
    { key: "petals", label: "Petals",       min: 4,  max: 16, step: 1, default: 8,
      shuffle: [5, 12] },
    { key: "width",  label: "Petal width",  min: 30, max: 90, step: 1, default: 80,
      shuffle: [50, 90], format: v => v + "%" },
  ],
  alternate: { label: "Interleave petal layers", default: true },
  maxEmoji: 6,
  overlap: OVERLAP,
  layout({ layers, petals, width, alternate, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont), P = petals, half = Math.PI / P;
    const need = (a, b) => emojiSize * (a + b) / 2 * (1 - OVERLAP);
    const placements = [], groups = [];
    const center = centerMode === "emoji";
    if (center){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, group: 0, index: 0 });
    }
    // Layer k fills a band from the center emoji to `radius`; outer bands are
    // wider (weights 2, 3, 4). Tips sit on the band's outer edge.
    const r0 = center ? need(CENTER_SCALE, 1) : 0;
    const weights = Array.from({ length: layers }, (_, k) => k + 2);
    const total = weights.reduce((a, b) => a + b, 0), edges = [r0];
    for (const w of weights) edges.push(edges.at(-1) + (radius - r0) * w / total);

    for (let k = 1; k <= layers; k++){
      const T = edges[k];
      const B = k === 1 ? r0 : Math.min(edges[k - 1] + 0.6 * need(1, 1), T - need(1, 1));
      const offset = alternate && k % 2 === 0 ? half : 0;
      // The ring of tips sets the layer's scale; a layer whose tips can't all
      // fit at the floor is dropped (spec §1 "Crowded groups").
      const fit = fitRing({ r: T, count: P, emojiPx: emojiSize, overlap: OVERLAP, floor });
      if (fit.count < P) continue;
      const s = fit.scale, step = emojiSize * s;
      // Width: a share of the half-petal angle, capped so a petal's widest
      // point clears its neighbour's.
      const rw = B + (T - B) / 3;
      const room = half - Math.asin(Math.min(1, need(s, s) / (2 * rw)));
      const phiMax = Math.min(room, half * width / 100);
      const units = 2 * rw * Math.sin(phiMax) < need(s, s) ? spoke(B, T, step) : outline(B, T, phiMax, step);
      // Keep a unit only if each of its points clears the inner layers and
      // every point kept so far, in every petal. The same units are kept in
      // every petal, so the layer stays symmetric. No tip, no layer.
      const at = (q, j) => {
        const axis = 2 * Math.PI * j / P + offset;
        return { ...polar(q.r, axis + q.phi), axis };
      };
      const inner = placements.slice(), kept = [];
      for (const unit of units){
        const others = [...kept, ...unit];
        const clear = unit.every(q => {
          const p = at(q, 0);
          if (inner.some(o => Math.hypot(p.x - o.x, p.y - o.y) < need(s, o.scale))) return false;
          for (let j = 0; j < P; j++) for (const t of others){
            if (j === 0 && t === q) continue;
            const o = at(t, j);
            if (Math.hypot(p.x - o.x, p.y - o.y) < need(s, s)) return false;
          }
          return true;
        });
        if (clear) kept.push(...unit);
        else if (unit === units[0]) break;
      }
      if (!kept.length) continue;
      // Tips and sides (or spoke) are a group each; both sides of petal j
      // share index j, so every petal is mirror-symmetric.
      const tips = groups.length;
      groups.push({ size: P, kind: "cycle" });
      const sides = kept.length > 1 ? groups.push({ size: P, kind: "cycle" }) - 1 : -1;
      for (let j = 0; j < P; j++) kept.forEach((q, n) => {
        const { x, y, axis } = at(q, j);
        placements.push({ x, y, heading: axis, scale: s, group: n === 0 ? tips : sides, index: j });
      });
    }
    return { placements, groups };
  },
};
