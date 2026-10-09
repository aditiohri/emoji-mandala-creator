import { fitFloor } from "./lib.js";

const DOT_SCALE = 1.05;
const OVERLAP = 0.15;
const LINE_SCALE = 0.65;  // lines are drawn finer than the emoji size (spec §1 "Kolam")

// The eight symmetries of the square, as maps on a position or a direction.
const SYM = [
  (x, y) => [x, y], (x, y) => [-y, x], (x, y) => [-x, -y], (x, y) => [y, -x],
  (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [y, x], (x, y) => [-y, -x],
];
const key = p => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;

// A point list (each { x, y, nx, ny }: position and outward direction) with all
// its symmetric copies, without repeats; heading null where there is no direction.
function orbit(pts){
  const out = new Map();
  for (const f of SYM) for (const p of pts){
    const [x, y] = f(p.x, p.y), [nx, ny] = f(p.nx, p.ny), q = { x, y, heading: nx || ny ? Math.atan2(ny, nx) : null };
    if (!out.has(key(q))) out.set(key(q), q);
  }
  return [...out.values()];
}

export default {
  id: "kolam",
  label: "Kolam",
  controls: [
    { key: "grid",    label: "Grid",    min: 3,  max: 9,   step: 2, default: 5, shuffle: [3, 7] },
    { key: "spacing", label: "Spacing", min: 50, max: 100, step: 1, default: 100, shuffle: [70, 100],
      format: v => (v / 100).toFixed(1) + "×" },
  ],
  alternate: { label: "Checker colours", default: false },
  maxEmoji: 6,
  overlap: OVERLAP,
  layout({ grid, spacing, alternate, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont), ls = Math.max(floor, LINE_SCALE);
    const need = (a, b) => emojiSize * (a + b) / 2 * (1 - OVERLAP);
    // Every point kept so far. A unit (a point and all its symmetric copies) is
    // kept only if each point clears everything kept and the rest of the unit,
    // so the figure stays symmetric (spec §1 "Crowded groups").
    const kept = [], done = new Set();
    const apart = (p, o, min) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 >= (min - 1e-9) ** 2;
    const tryUnit = (pts, scale, role) => {
      const unit = orbit(pts);
      if (done.has(key(unit[0]))) return;
      unit.forEach(p => done.add(key(p)));
      const ok = unit.every((p, i) =>
        kept.every(o => apart(p, o, need(scale, o.scale))) &&
        unit.every((q, j) => j === i || apart(p, q, need(scale, scale))));
      if (ok) for (const p of unit) kept.push({ ...p, scale, role });
    };

    // Dots on a g × g lattice of step s, the corners of its outermost diamonds
    // on `radius` (times Spacing). A diamond is `m` steps a side (its points
    // are L/m apart, L = s/√2); the lattice loses a ring of dots at a time until
    // the point next to a knot clears the dot inside the diamond, so the
    // diamonds always show (never a bare dot grid).
    const reach = k => radius / Math.hypot(k + 0.5, k) * spacing / 100;
    const steps = s => Math.max(1, Math.floor(s / Math.SQRT2 / need(ls, ls) + 1e-9));
    const roomy = s => { const m = steps(s), f = 1 / m; return m >= 2 && s / 2 * Math.hypot(1 - f, f) >= need(DOT_SCALE, ls) - 1e-9; };
    let g = grid, km = (g - 1) / 2, s = reach(km);
    while (g > 1 && !roomy(s)){ g -= 2; km = (g - 1) / 2; s = reach(km); }

    const cells = [];
    for (let i = 0; i <= km; i++) for (let j = 0; j <= i; j++) cells.push([i, j]);
    cells.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || b[0] - a[0]);
    const odd = (i, j) => (alternate && (i + j) % 2 ? 1 : 0);

    // Dots, then the knots where neighbouring diamonds touch (edge midpoints
    // between dots), then points along the diamond sides, those nearest a knot
    // first: crowding thins the middle of a side before its ends.
    for (const [i, j] of cells){
      if (i === 0 && centerMode === "empty") continue;
      tryUnit([{ x: i * s, y: j * s, nx: i, ny: j }], DOT_SCALE, "dots" + odd(i, j));
    }
    const knots = [];
    for (let a = 0; a <= km; a++) for (let b = 0; b <= km; b++) knots.push([a + 0.5, b]);
    knots.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
    for (const [a, b] of knots) tryUnit([{ x: a * s, y: b * s, nx: a, ny: b }], ls, "knots");

    const m = steps(s);
    for (let t = 1; t <= m / 2; t++) for (const [i, j] of cells){
      const c = { x: i * s, y: j * s }, V = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([a, b]) => ({ x: c.x + a * s / 2, y: c.y + b * s / 2 }));
      const pts = [];
      for (let q = 0; q < 4; q++){
        const A = V[q], B = V[(q + 1) % 4], nx = (A.x + B.x) / 2 - c.x, ny = (A.y + B.y) / 2 - c.y;
        for (const f of new Set([t, m - t])) pts.push({ x: A.x + (B.x - A.x) * f / m, y: A.y + (B.y - A.y) * f / m, nx, ny });
      }
      tryUnit(pts, ls, "lines" + odd(i, j));
    }

    // Groups inside out, with fixed role slots: dots 0 (second dots 3), knots 2,
    // lines 1 (second lines 4). "Empty" removes the centre dot.
    const order = [["dots0", 0], ["dots1", 3], ["knots", 2], ["lines0", 1], ["lines1", 4]];
    const groups = [], placements = [];
    for (const [role, slot] of order){
      const pts = kept.filter(p => p.role === role);
      if (!pts.length) continue;
      const gi = groups.push({ size: 1, kind: "solid", slot }) - 1;
      for (const p of pts) placements.push({ x: p.x, y: p.y, heading: p.heading, scale: p.scale, group: gi, index: 0 });
    }
    return { placements, groups };
  },
};
