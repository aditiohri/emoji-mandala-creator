import { test } from "node:test";
import assert from "node:assert/strict";
import kolam from "../js/shapes/kolam.js";

const base = { grid: 5, spacing: 100, alternate: false, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const has = (ps, q) => ps.some(o => near(o.x, q.x) && near(o.y, q.y));
const inGroup = (L, slot) => L.placements.filter(p => p.group === L.groups.findIndex(g => g.slot === slot));

test("kolam controls match the spec", () => {
  assert.equal(kolam.id, "kolam");
  assert.equal(kolam.label, "Kolam");
  assert.deepEqual(kolam.controls.map(c => [c.key, c.label, c.min, c.max, c.step, c.default, c.shuffle]),
    [["grid", "Grid", 3, 9, 2, 5, [3, 7]], ["spacing", "Spacing", 50, 100, 1, 100, [70, 100]]]);
  assert.equal(kolam.controls[1].format(90), "0.9×");
  assert.deepEqual(kolam.alternate, { label: "Checker colours", default: false });
  assert.equal(kolam.maxEmoji, 6);
  assert.equal(kolam.overlap, 0.15);
});

test("defaults: dots, knots and lines are separate groups with fixed slots", () => {
  const L = kolam.layout(base);
  assert.deepEqual(L.groups, [
    { size: 1, kind: "solid", slot: 0 },   // dots
    { size: 1, kind: "solid", slot: 2 },   // knots
    { size: 1, kind: "solid", slot: 1 },   // lines
  ]);
  assert.deepEqual(L.placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.equal(inGroup(L, 0).length, 25);                  // a 5 × 5 lattice
  assert.equal(inGroup(L, 2).length, 60);                  // 6 touch points a row, both ways
  assert.ok(inGroup(L, 0).every(p => p.scale === 1.05));
  assert.ok([...inGroup(L, 1), ...inGroup(L, 2)].every(p => p.scale === 0.65));
  assert.ok(inGroup(L, 1).length >= 4 * 25, "every diamond has side points");
});

test("the dots are a square lattice and each knot is shared by two diamonds", () => {
  const L = kolam.layout(base), dots = inGroup(L, 0), knots = inGroup(L, 2);
  const s = Math.abs(dots.filter(p => near(p.y, 0)).map(p => p.x).filter(x => x > 1).sort((a, b) => a - b)[0]);
  assert.ok(dots.every(p => near(p.x / s, Math.round(p.x / s)) && near(p.y / s, Math.round(p.y / s))));
  for (const k of knots) {
    // half a step from a dot along one axis, exactly
    const ax = near(Math.abs(k.x / s) % 1, 0.5), ay = near(Math.abs(k.y / s) % 1, 0.5);
    assert.ok(ax !== ay, "one coordinate is a half step");
  }
  assert.ok(has(knots, { x: s / 2, y: 0 }) && has(knots, { x: 0, y: s / 2 }));
});

test("the whole figure keeps its 4-fold rotation and mirror symmetry, scale included", () => {
  for (const alternate of [false, true]) for (const emojiSize of [32, 44, 60, 80]) {
    const L = kolam.layout({ ...base, alternate, emojiSize, radius: 500 - emojiSize * 0.9 });
    for (const p of L.placements) {
      for (const q of [{ x: -p.y, y: p.x }, { x: -p.x, y: p.y }, { x: p.y, y: p.x }]) {
        const m = L.placements.find(o => near(o.x, q.x, 1e-6) && near(o.y, q.y, 1e-6));
        assert.ok(m, `copy of (${p.x}, ${p.y})`);
        assert.equal(m.scale, p.scale);
        assert.equal(L.groups[m.group].slot, L.groups[p.group].slot);
      }
    }
  }
});

test("Checker colours: odd cells take a second dot and a second line colour", () => {
  const L = kolam.layout({ ...base, alternate: true });
  assert.deepEqual(L.groups.map(g => g.slot), [0, 3, 2, 1, 4]);
  assert.deepEqual([0, 3].map(slot => inGroup(L, slot).length), [13, 12]);
  assert.ok(inGroup(L, 4).length > 0 && inGroup(L, 1).length > inGroup(L, 4).length);
  assert.equal(kolam.layout({ ...base, alternate: false }).groups.length, 3);
  // the centre dot and the knots are always in the first colours
  assert.deepEqual(L.placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
});

test("empty centre removes the centre dot only", () => {
  const L = kolam.layout({ ...base, centerMode: "empty" });
  assert.deepEqual(L.groups.map(g => g.slot), [0, 2, 1]);
  assert.equal(inGroup(L, 0).length, 24);
  assert.ok(!has(L.placements, { x: 0, y: 0 }));
  assert.ok(L.placements.every(p => p.heading !== null));
});

test("crowded: the lattice loses rings of dots but every diamond keeps its side points", () => {
  const dots = a => inGroup(kolam.layout({ ...base, ...a }), 0).length;
  assert.equal(dots({}), 25);
  assert.equal(dots({ emojiSize: 80, radius: 500 - 72 }), 9);                 // Grid 5 -> 3
  assert.equal(dots({ emojiSize: 80, radius: 500 - 72, grid: 3, spacing: 50 }), 1);
  assert.equal(dots({ grid: 7 }), 49);
  assert.equal(dots({ grid: 7, spacing: 90 }), 25);                            // 7 -> 5 at Spacing 0.9
  assert.equal(dots({ grid: 9 }), 49);                                         // 9 -> 7 at the default size
  assert.equal(dots({ emojiSize: 20, grid: 9, radius: 500 - 18 }), 81);
});

// Spec §7 sweep: every pair of placements, overlap 0.15.
test("sweep: finite, inside radius, one index, no overlaps beyond 0.15, diamonds always drawn", () => {
  for (const grid of [3, 5, 7, 9]) for (const spacing of [50, 70, 90, 100]) for (const alternate of [true, false])
  for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 44, 80]) {
    const radius = 500 - emojiSize * 0.9, minFont = 14;
    const tag = JSON.stringify({ grid, spacing, alternate, centerMode, emojiSize });
    const { placements: P, groups } = kolam.layout({ grid, spacing, alternate, centerMode, radius, emojiSize, minFont });
    for (const slot of [2, 1]) assert.ok(groups.some(g => g.slot === slot), tag + " slot " + slot);
    for (let g = 1; g < groups.length; g++) assert.notEqual(groups[g].slot, groups[g - 1].slot, tag + " adjacent slots");
    for (const p of P) {
      for (const v of [p.x, p.y, p.scale]) assert.ok(Number.isFinite(v), tag);
      assert.ok(Math.hypot(p.x, p.y) <= radius + emojiSize, tag);
      assert.ok(p.scale >= minFont / emojiSize, tag);
      assert.equal(p.index, 0, tag);
    }
    groups.forEach((g, gi) => { assert.equal(g.size, 1, tag); assert.ok(P.some(p => p.group === gi), tag); });
    const sorted = [...P].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      const min = 0.95 * emojiSize * (a.scale + b.scale) / 2 * (1 - kolam.overlap);
      if (b.x - a.x >= emojiSize * 1.1) break;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= min, tag);
    }
  }
});
