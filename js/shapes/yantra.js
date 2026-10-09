import { polar, fitFloor, polygonPoints, petalOutline, petalSpoke } from "./lib.js";

const CENTER_SCALE = 1.05;
const OVERLAP = 0.15;
const LINE_SCALE = 0.65;  // lines are drawn finer than the emoji size (spec §1 "Yantra")
const PETAL_WIDTH = 0.8;  // share of the half-petal angle, as the Lotus default
const TAU = 2 * Math.PI;

export default {
  id: "yantra",
  label: "Yantra",
  controls: [
    { key: "triangles", label: "Triangles", min: 1, max: 3,  step: 1, default: 1 },
    { key: "petals",    label: "Petals",    min: 8, max: 16, step: 4, default: 8 },
  ],
  alternate: { label: "Offset petals", default: false },
  maxEmoji: 6,
  overlap: OVERLAP,
  layout({ triangles, petals, alternate, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont), ls = Math.max(floor, LINE_SCALE);
    const need = (a, b) => emojiSize * (a + b) / 2 * (1 - OVERLAP);
    // Every point kept so far. A unit (a point and all its symmetric copies)
    // is kept only if each point clears everything kept and the rest of the
    // unit, so every part stays symmetric (spec §1 "Crowded groups").
    const kept = [];
    const apart = (p, o, min) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 >= (min - 1e-9) ** 2;
    const add = (unit, s, role) => {
      const ok = unit.every((p, i) =>
        kept.every(o => apart(p, o, need(s, o.scale))) &&
        unit.every((q, j) => j === i || apart(p, q, need(s, s))));
      if (ok) for (const p of unit) kept.push({ index: 0, ...p, scale: s, role });
      return ok;
    };

    const center = centerMode === "emoji";
    if (center) kept.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, role: "bindu", index: 0 });

    // Bhupura: a square with its corners on `radius`, on a lattice of step d.
    // Each gate is a T outline on the same lattice, filling the band from the
    // square's side out to `radius`: an opening, a neck w1 wide, then a head
    // w2 wide (spec §5 "Yantra").
    const h = radius / Math.SQRT2, q = Math.max(1, Math.floor(h / (emojiSize * ls))), d = h / q;
    const n = Math.floor((radius - h) / d + 1e-9);
    const gates = n >= 2, w1 = Math.max(1, Math.round(n / 4)), w2 = 2 * w1, a = Math.floor(n / 2);
    const square = polygonPoints(4, radius, -3 * Math.PI / 4, 2 * q)
      .filter(p => !gates || Math.abs(p.i - q) >= w1)
      .map(p => ({ x: p.x, y: p.y, heading: p.i === 0 ? Math.atan2(p.y, p.x) : -Math.PI / 2 + p.side * Math.PI / 2 }));
    add(square, ls, "square");
    if (gates){
      const cells = [];
      for (let j = 1; j <= a; j++) cells.push([j, w1], [j, -w1]);
      for (let t = w1 + 1; t <= w2; t++) cells.push([a, t], [a, -t]);
      for (let j = a + 1; j <= n; j++) cells.push([j, w2], [j, -w2]);
      for (let t = 1 - w2; t <= w2 - 1; t++) cells.push([n, t]);
      const unit = [];
      for (let k = 0; k < 4; k++){
        const ax = -Math.PI / 2 + k * Math.PI / 2, c = Math.cos(ax), s = Math.sin(ax);
        for (const [j, t] of cells){
          const u = h + j * d, v = t * d;
          unit.push({ x: u * c - v * s, y: u * s + v * c, heading: ax });
        }
      }
      add(unit, ls, "gates");
    }

    // Hexagrams, outermost first: two triangles drawn as full lines (up and
    // down) whose six crossings are the knots. Each side is split in thirds at
    // the knots, `m` steps per third, so points next to a crossing are one
    // step apart. Nested stars are turned 30° and sit inside the knots; they
    // use the floor scale.
    const T = h - need(ls, ls);              // lotus tips, clear of the square
    const R1 = (0.58 + 0.08 * (triangles - 1)) * T;
    const star = (R, k, s) => {
      const turn = k % 2 ? Math.PI / 6 : 0;
      const m = Math.max(1, Math.floor(R / Math.sqrt(3) / (emojiSize * s)));
      const tri = [-Math.PI / 2 + turn, Math.PI / 2 + turn].map(start =>
        polygonPoints(3, R, start, 3 * m).map(p => ({
          x: p.x, y: p.y, i: p.i,
          heading: p.i === 0 ? start + p.side * TAU / 3 : start + (p.side + 0.5) * TAU / 3,
        })));
      const at = (t, i) => tri[t].filter(p => p.i === i);
      if (!add([...at(0, 0), ...at(1, 0)], s, `up${k}`)) return false;
      kept.slice(-3).forEach(p => p.role = `down${k}`);
      add([...at(0, m), ...at(0, 2 * m)], s, `knots${k}`);
      for (let i = 1; i <= 3 * m / 2; i++){
        if (i % m === 0) continue;
        const ii = [...new Set([i, 3 * m - i])];
        const up = ii.flatMap(j => at(0, j)), down = ii.flatMap(j => at(1, j));
        if (add([...up, ...down], s, `up${k}`)) kept.slice(-down.length).forEach(p => p.role = `down${k}`);
      }
      return true;
    };
    const radii = [R1];
    const scales = [ls];
    for (let k = 1; k < triangles; k++){
      scales.push(floor);
      radii.push(radii[k - 1] / Math.sqrt(3) - need(floor, scales[k - 1]));
    }
    star(R1, 0, ls);

    // Lotus: one ring of P petals between the outer star and the square,
    // outlined like the Lotus shape, or spokes, whichever keeps more emoji.
    const P = petals, half = Math.PI / P, offset = alternate ? half : 0, B = R1;
    const petal = (pt, j) => {
      const axis = -Math.PI / 2 + TAU * j / P + offset;
      return { ...polar(pt.r, axis + pt.phi), heading: axis, index: j };
    };
    const trial = units => {
      const before = kept.length;
      for (const u of units){
        const unit = [];
        for (let j = 0; j < P; j++) for (const pt of u) unit.push(petal(pt, j));
        if (!add(unit, ls, "lotus") && u === units[0]) break;
      }
      return kept.splice(before);
    };
    const rw = B + (T - B) / 3;
    const room = half - Math.asin(Math.min(1, need(ls, ls) / (2 * rw)));
    const phiMax = Math.min(room, half * PETAL_WIDTH);
    const spoke = trial(petalSpoke(B, T, emojiSize * ls));
    const outline = 2 * rw * Math.sin(phiMax) < need(ls, ls) ? [] : trial(petalOutline(B, T, phiMax, emojiSize * ls));
    kept.push(...(outline.length > spoke.length ? outline : spoke));

    // Inner stars; a star that doesn't fit drops it and every star inside it.
    for (let k = 1; k < triangles; k++) if (!star(radii[k], k, scales[k])) break;

    // Groups inside out, with fixed role slots: bindu 0; per star the up
    // triangle 1, the down triangle 2, the knots 0; lotus 3 (a cycle, petal by
    // petal); square 5; gates 4.
    const order = [["bindu", "solid", 0]];
    for (let k = triangles - 1; k >= 0; k--) order.push([`up${k}`, "solid", 1], [`down${k}`, "solid", 2], [`knots${k}`, "solid", 0]);
    order.push(["lotus", "cycle", 3], ["square", "solid", 5], ["gates", "solid", 4]);
    const groups = [], placements = [];
    for (const [role, kind, slot] of order){
      const pts = kept.filter(p => p.role === role);
      if (!pts.length) continue;
      const g = groups.push({ size: kind === "cycle" ? P : 1, kind, slot }) - 1;
      for (const p of pts) placements.push({ x: p.x, y: p.y, heading: p.heading, scale: p.scale, group: g, index: p.index });
    }
    return { placements, groups };
  },
};
