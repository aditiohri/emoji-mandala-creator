import { test } from "node:test";
import assert from "node:assert/strict";
import yantra from "../js/shapes/yantra.js";
import { fitFloor } from "../js/shapes/lib.js";

const base = { triangles: 1, petals: 8, alternate: false, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
// Rotate a placement by angle a about the center.
const rot = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });
const has = (ps, q) => ps.some(o => near(o.x, q.x) && near(o.y, q.y));
const inGroup = (L, slot, nth = 0) => {
  const gi = L.groups.map((g, i) => [g, i]).filter(([g]) => g.slot === slot)[nth][1];
  return L.placements.filter(p => p.group === gi);
};

test("yantra controls match the spec", () => {
  assert.equal(yantra.id, "yantra");
  assert.equal(yantra.label, "Yantra");
  assert.deepEqual(yantra.controls.map(c => [c.key, c.label, c.min, c.max, c.step, c.default]),
    [["triangles", "Triangles", 1, 3, 1, 1], ["petals", "Petals", 8, 16, 4, 8]]);
  assert.deepEqual(yantra.alternate, { label: "Offset petals", default: false });
  assert.equal(yantra.maxEmoji, 6);
  assert.equal(yantra.overlap, 0.15);
});

test("defaults: groups inside out with fixed role slots", () => {
  const L = yantra.layout(base);
  assert.deepEqual(L.placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.deepEqual(L.groups, [
    { size: 1, kind: "solid", slot: 0 },   // bindu
    { size: 1, kind: "solid", slot: 1 },   // up triangle
    { size: 1, kind: "solid", slot: 2 },   // down triangle
    { size: 1, kind: "solid", slot: 0 },   // knots
    { size: 8, kind: "cycle", slot: 3 },   // lotus
    { size: 1, kind: "solid", slot: 5 },   // square
    { size: 1, kind: "solid", slot: 4 },   // gates
  ]);
  // every line is drawn at 0.65× the emoji size
  assert.ok(L.placements.slice(1).every(p => p.scale === 0.65));
});

test("square: corners on the radius, an opening at each side's middle, gates reach no further than the radius", () => {
  const L = yantra.layout(base), R = base.radius, h = R / Math.SQRT2;
  const sq = inGroup(L, 5);
  for (const c of [[-h, -h], [h, -h], [h, h], [-h, h]]) assert.ok(has(sq, { x: c[0], y: c[1] }), "corner " + c);
  assert.ok(sq.every(p => near(Math.max(Math.abs(p.x), Math.abs(p.y)), h)), "on the square");
  assert.ok(!has(sq, { x: 0, y: -h }), "opening at the top side's middle");
  const gates = inGroup(L, 4);
  assert.ok(gates.every(p => Math.max(Math.abs(p.x), Math.abs(p.y)) > h + 1 && Math.max(Math.abs(p.x), Math.abs(p.y)) <= R + 1e-9));
  assert.ok(has(gates, { x: 0, y: -Math.max(...gates.map(p => -p.y)) }), "top bar crosses the gate axis");
  // four-fold rotation and mirror of the frame
  for (const p of [...sq, ...gates]) {
    assert.ok(has([...sq, ...gates], rot(p, Math.PI / 2)));
    assert.ok(has([...sq, ...gates], { x: -p.x, y: p.y }));
  }
});

test("hexagram: two full triangles; 60° maps up onto down; six knots", () => {
  const L = yantra.layout(base);
  const up = inGroup(L, 1), down = inGroup(L, 2), knots = inGroup(L, 0, 1);
  assert.equal(up.length, down.length);
  assert.ok(up.length >= 12, "full lines, not just tips");
  for (const p of up) {
    assert.ok(has(down, rot(p, Math.PI / 3)), "60° rotation of up lies in down");
    assert.ok(has(up, rot(p, 2 * Math.PI / 3)), "up is 3-fold");
    assert.ok(has(up, { x: -p.x, y: p.y }), "up is mirror-symmetric");
  }
  // the up triangle points straight up
  const top = up.reduce((a, b) => (b.y < a.y ? b : a));
  assert.ok(near(top.x, 0) && top.y < 0);
  // knots: 6 points on one circle at R1/√3
  assert.equal(knots.length, 6);
  const r = Math.hypot(knots[0].x, knots[0].y), R1 = Math.hypot(top.x, top.y);
  knots.forEach(p => assert.ok(near(Math.hypot(p.x, p.y), r)));
  assert.ok(near(r, R1 / Math.sqrt(3)));
});

test("nested stars: each turned 30°, inside the knots, at the floor scale", () => {
  const L = yantra.layout({ ...base, triangles: 2 });
  assert.equal(L.groups.filter(g => g.slot === 1).length, 2);
  const inner = inGroup(L, 1, 0), outer = inGroup(L, 1, 1);
  const tip = ps => ps.reduce((a, b) => (Math.hypot(b.x, b.y) > Math.hypot(a.x, a.y) ? b : a));
  const it = tip(inner), ot = tip(outer);
  const knot = Math.hypot(ot.x, ot.y) / Math.sqrt(3);
  assert.ok(Math.hypot(it.x, it.y) < knot);
  // inner tips point at the outer star's knots (30° off the vertical)
  const angles = inner.filter(p => near(Math.hypot(p.x, p.y), Math.hypot(it.x, it.y))).map(p => Math.atan2(p.y, p.x));
  assert.ok(angles.some(a => near(a, -Math.PI / 2 + Math.PI / 6)));
  assert.ok(inner.every(p => p.scale === fitFloor(44, 14)));
});

test("lotus: P petals pointing at the gates; Offset turns them half a petal; outlined at defaults", () => {
  for (const petals of [8, 12, 16]) for (const alternate of [false, true]) {
    const L = yantra.layout({ ...base, petals, alternate });
    const lotus = inGroup(L, 3), half = Math.PI / petals;
    assert.equal(L.groups.find(g => g.slot === 3).size, petals);
    for (const p of lotus) {
      assert.ok(near(p.heading, -Math.PI / 2 + 2 * Math.PI * p.index / petals + (alternate ? half : 0)));
      assert.ok(has(lotus, rot(p, 2 * Math.PI / petals)), `rotation ${petals}`);
    }
  }
  const p0 = inGroup(yantra.layout(base), 3).filter(p => p.index === 0);
  assert.ok(p0.length >= 5 && p0.some(p => !near(Math.atan2(p.y, p.x), p.heading)), "outlined, not a spoke");
});

test("empty center: no bindu; the knots still take slot 0", () => {
  const L = yantra.layout({ ...base, centerMode: "empty" });
  assert.deepEqual(L.groups.map(g => g.slot), [1, 2, 0, 3, 5, 4]);
  assert.ok(L.placements.every(p => p.heading !== null));
});

test("crowded: inner stars drop first; the frame, the lotus and the outer star stay", () => {
  const L = yantra.layout({ ...base, triangles: 3, petals: 16, emojiSize: 80, radius: 500 - 72 });
  assert.equal(L.groups.filter(g => g.slot === 1).length, 2);
  for (const slot of [3, 4, 5]) assert.ok(L.groups.some(g => g.slot === slot), "slot " + slot);
  assert.equal(L.groups.find(g => g.slot === 3).size, 16);
});

// Spec §7 sweep: every pair of placements, overlap 0.15.
test("sweep: finite, inside radius, groups cover indices, no overlaps beyond 0.15, frame always drawn", () => {
  for (const triangles of [1, 2, 3]) for (const petals of [8, 12, 16]) for (const alternate of [true, false])
  for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 32, 44, 56, 68, 80]) {
    const radius = 500 - emojiSize * 0.9, minFont = 14;
    const tag = JSON.stringify({ triangles, petals, alternate, centerMode, emojiSize });
    const { placements: P, groups } = yantra.layout({ triangles, petals, alternate, centerMode, radius, emojiSize, minFont });
    for (const slot of [1, 2, 3, 4, 5]) assert.ok(groups.some(g => g.slot === slot), tag + " slot " + slot);
    for (let g = 1; g < groups.length; g++) assert.notEqual(groups[g].slot, groups[g - 1].slot, tag + " adjacent slots");
    for (const p of P) {
      for (const v of [p.x, p.y, p.scale]) assert.ok(Number.isFinite(v), tag);
      assert.ok(Math.hypot(p.x, p.y) <= radius + emojiSize, tag);
      assert.ok(p.scale >= minFont / emojiSize, tag);
    }
    groups.forEach((g, gi) => {
      const idx = new Set(P.filter(p => p.group === gi).map(p => p.index));
      assert.equal(idx.size, g.size, tag);
      for (let i = 0; i < g.size; i++) assert.ok(idx.has(i), tag);
    });
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      assert.ok(d >= 0.95 * emojiSize * (P[i].scale + P[j].scale) / 2 * (1 - yantra.overlap), tag);
    }
  }
});
