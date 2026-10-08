import { test } from "node:test";
import assert from "node:assert/strict";
import { polar, fitFloor } from "../js/shapes/lib.js";
import rings from "../js/shapes/rings.js";
import { SHAPES, getShape } from "../js/shapes/index.js";

const base = { rings: 6, symmetry: 10, spacing: 100, alternate: true, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };
const ringRadii = ps => [...new Set(ps.filter(p => p.heading !== null).map(p => Math.hypot(p.x, p.y).toFixed(6)))].map(Number);

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

test("center heading is null; center first; counts at defaults", () => {
  const { placements, groups } = rings.layout(base);
  assert.deepEqual(placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.deepEqual(groups[0], { size: 1, kind: "solid", slot: 0 });
  assert.equal(placements.length, 1 + 6 * 10);
  assert.equal(groups.length, 7);
  assert.ok(!("guides" in rings.layout(base)));
});

test("empty center removes group 0", () => {
  const { placements, groups } = rings.layout({ ...base, centerMode: "empty" });
  assert.equal(placements.length, 60);
  assert.deepEqual(groups[0], { size: 10, kind: "cycle", reverse: false });
  assert.ok(placements.every(p => p.heading !== null));
});

test("roomy settings keep today's geometry (no fit needed)", () => {
  const p = { ...base, spacing: 80, symmetry: 7 };
  const { placements, groups } = rings.layout(p);
  const step = (80 / 100) * (p.radius / 6);
  let n = 1;
  for (let k = 1; k <= 6; k++) {
    const alt = k % 2 === 0;
    assert.deepEqual(groups[k], { size: 7, kind: "cycle", reverse: alt });
    for (let s = 0; s < 7; s++, n++) {
      const angle = (alt ? -1 : 1) * (s / 7) * Math.PI * 2 + (alt ? Math.PI / 7 : 0);
      const q = placements[n];
      assert.equal(q.group, k); assert.equal(q.index, s);
      assert.equal(q.heading, angle);
      assert.equal(q.scale, 1 - (k - 1) * 0.03);
      assert.ok(Math.abs(q.x - Math.cos(angle) * k * step) < 1e-9);
      assert.ok(Math.abs(q.y - Math.sin(angle) * k * step) < 1e-9);
    }
  }
});

test("alternate off: no reverse, no offset", () => {
  const { groups, placements } = rings.layout({ ...base, alternate: false });
  assert.ok(groups.slice(1).every(g => g.reverse === false));
  assert.equal(placements[1 + 10].heading, 0); // ring 2, s = 0
});

test("spacing 1.0x spreads rings to the radius; <1 packs inward; >1 packs outward", () => {
  const even = ringRadii(rings.layout(base).placements);
  assert.ok(Math.abs(even.at(-1) - base.radius) < 1e-6);
  assert.ok(Math.abs(even[0] - base.radius / 6) < 1e-6);
  const inward = ringRadii(rings.layout({ ...base, spacing: 50 }).placements);
  assert.ok(Math.abs(inward.at(-1) - base.radius / 2) < 1e-6);
  const outward = ringRadii(rings.layout({ ...base, spacing: 150 }).placements);
  assert.ok(Math.abs(outward.at(-1) - base.radius) < 1e-6, "outer ring stays on the radius");
  assert.ok(Math.abs(outward[0] - base.radius * (1 - 5 / 12)) < 1e-6, "inner ring moves out: open center");
});

test("the slider has no dead range: every spacing step moves the rings", () => {
  let prev = null;
  for (let sp = 50; sp <= 150; sp += 5) {
    const r = ringRadii(rings.layout({ ...base, spacing: sp }).placements);
    if (prev) assert.notDeepEqual(r, prev, `spacing ${sp}`);
    prev = r;
  }
});

test("crowded ring is re-spaced evenly with fewer emoji, at the floor scale", () => {
  const p = { ...base, rings: 12, symmetry: 24 };
  const { placements, groups } = rings.layout(p);
  const g = groups.findIndex(gr => gr.kind === "cycle" && gr.size < 24);
  assert.ok(g > 0, "some ring was re-spaced");
  const ps = placements.filter(q => q.group === g);
  assert.equal(ps.length, groups[g].size);
  const angles = ps.map(q => q.heading).map(a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
  const stepA = 2 * Math.PI / ps.length;
  angles.forEach((a, i) => i && assert.ok(Math.abs(a - angles[i - 1] - stepA) < 1e-9));
  assert.ok(ps.every(q => q.scale === fitFloor(44, 14)));
});

// Spec §7 sweep. Every pair of placements, every slider value of the rings shape.
test("sweep: finite, inside radius, groups cover indices, no overlaps, scale >= font floor", () => {
  for (let r = 1; r <= 12; r++) for (const sym of [3, 4, 5, 7, 10, 12, 13, 16, 24]) for (const sp of [50, 75, 100, 125, 150])
  for (const alternate of [true, false]) for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 44, 80]) {
    const radius = 500 - emojiSize * 0.9, minFont = 14;
    const tag = JSON.stringify({ r, sym, sp, alternate, centerMode, emojiSize });
    const { placements: P, groups } = rings.layout({ rings: r, symmetry: sym, spacing: sp, alternate, centerMode, radius, emojiSize, minFont });
    assert.ok(groups.some(g => g.kind === "cycle"), tag + " at least one ring");
    for (const p of P) {
      for (const v of [p.x, p.y, p.scale]) assert.ok(Number.isFinite(v), tag);
      assert.ok(Math.hypot(p.x, p.y) <= radius + emojiSize, tag);
      assert.ok(p.scale >= minFont / emojiSize, tag);
    }
    groups.forEach((g, gi) => {
      assert.ok(g.size >= 1, tag);
      const idx = new Set(P.filter(p => p.group === gi).map(p => p.index));
      assert.equal(idx.size, g.size, tag);
      for (let i = 0; i < g.size; i++) assert.ok(idx.has(i), tag);
    });
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      assert.ok(d >= 0.95 * emojiSize * (P[i].scale + P[j].scale) / 2 * (1 - rings.overlap), tag);
    }
  }
});
