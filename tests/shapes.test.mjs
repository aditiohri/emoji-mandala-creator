import { test } from "node:test";
import assert from "node:assert/strict";
import { polar } from "../js/shapes/lib.js";
import rings from "../js/shapes/rings.js";
import { SHAPES, getShape } from "../js/shapes/index.js";

const base = { rings: 6, symmetry: 10, spacing: 100, alternate: true, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };

test("polar", () => {
  const p = polar(2, Math.PI / 2);
  assert.ok(Math.abs(p.x) < 1e-12);
  assert.equal(p.y, 2);
});

test("registry", () => {
  assert.deepEqual(SHAPES.map(s => s.id), ["rings"]);
  assert.equal(getShape("rings"), rings);
  assert.equal(getShape("nope"), rings);
});

test("rings controls match the spec", () => {
  assert.deepEqual(rings.controls.map(c => [c.key, c.min, c.max, c.step, c.default]),
    [["rings", 1, 12, 1, 6], ["symmetry", 3, 24, 1, 10], ["spacing", 50, 150, 1, 100]]);
  assert.equal(rings.controls[2].format(100), "1.0×");
  assert.deepEqual(rings.alternate, { label: "Stagger alternate rings", default: true });
  assert.equal(rings.maxEmoji, 6);
  assert.equal(rings.overlap, 0);
});

test("center heading is null; center first; counts", () => {
  const { placements, groups } = rings.layout(base);
  assert.deepEqual(placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.deepEqual(groups[0], { size: 1, kind: "solid", slot: 0 });
  assert.equal(placements.length, 1 + 6 * 10);
  assert.equal(groups.length, 7);
});

test("empty center removes group 0", () => {
  const { placements, groups } = rings.layout({ ...base, centerMode: "empty" });
  assert.equal(placements.length, 60);
  assert.deepEqual(groups[0], { size: 10, kind: "cycle", reverse: false, ring: 1 });
  assert.ok(placements.every(p => p.heading !== null));
});

test("ring geometry matches today's draw loop", () => {
  const p = { ...base, spacing: 80, symmetry: 7 };
  const { placements, groups } = rings.layout(p);
  const ringSpacing = (80 / 100) * (p.radius / 6);
  let n = 1;
  for (let k = 1; k <= 6; k++) {
    const alt = k % 2 === 0;
    assert.deepEqual(groups[k], { size: 7, kind: "cycle", reverse: alt, ring: k });
    for (let s = 0; s < 7; s++, n++) {
      const angle = (alt ? -1 : 1) * (s / 7) * Math.PI * 2 + (alt ? Math.PI / 7 : 0);
      const q = placements[n];
      assert.equal(q.group, k); assert.equal(q.index, s);
      assert.equal(q.heading, angle);
      assert.equal(q.scale, 1 - (k - 1) * 0.03);
      assert.ok(Math.abs(q.x - Math.cos(angle) * k * ringSpacing) < 1e-9);
      assert.ok(Math.abs(q.y - Math.sin(angle) * k * ringSpacing) < 1e-9);
    }
  }
});

test("alternate off: no reverse, no offset", () => {
  const { groups, placements } = rings.layout({ ...base, alternate: false });
  assert.ok(groups.slice(1).every(g => g.reverse === false));
  assert.equal(placements[1 + 10].heading, 0); // ring 2, s = 0
});

test("guides: one circle per ring at ring radius", () => {
  const { guides } = rings.layout({ ...base, spacing: 150, rings: 3 });
  const rs = (150 / 100) * (base.radius / 3);
  assert.deepEqual(guides, [1, 2, 3].map(k => ({ type: "circle", r: k * rs })));
});

// Spec §7 sweep, minus the overlap/scale checks (slice 2+) and minus
// "within radius + emojiSize": today's geometry puts outer rings at up to
// 1.5×radius when spacing > 100, and slice 1 must reproduce that.
test("sweep: finite numbers, group sizes cover their indices", () => {
  for (const r of [1, 2, 5, 12]) for (const sym of [3, 4, 10, 13, 24]) for (const sp of [50, 100, 150])
  for (const alternate of [true, false]) for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 44, 80]) {
    const radius = 500 - emojiSize * 0.9;
    const { placements, groups } = rings.layout({ rings: r, symmetry: sym, spacing: sp, alternate, centerMode, radius, emojiSize, minFont: 14 });
    for (const p of placements) for (const v of [p.x, p.y, p.scale]) assert.ok(Number.isFinite(v));
    groups.forEach((g, gi) => {
      const idx = new Set(placements.filter(p => p.group === gi).map(p => p.index));
      assert.equal(idx.size, g.size);
      for (let i = 0; i < g.size; i++) assert.ok(idx.has(i));
    });
  }
});
