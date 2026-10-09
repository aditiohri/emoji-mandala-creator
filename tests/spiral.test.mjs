import { test } from "node:test";
import assert from "node:assert/strict";
import spiral from "../js/shapes/spiral.js";
import { fitFloor } from "../js/shapes/lib.js";

const base = { seeds: 144, divergence: 137.5, bands: 3, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };
const seedsOf = ps => ps.filter(p => p.heading !== null);

test("spiral controls match the spec", () => {
  assert.equal(spiral.id, "spiral");
  assert.equal(spiral.label, "Phyllotaxis spiral");
  assert.deepEqual(spiral.controls.map(c => [c.key, c.min, c.max, c.step, c.default]),
    [["seeds", 40, 300, 1, 144], ["divergence", 137, 138, 0.05, 137.5], ["bands", 1, 5, 1, 3]]);
  assert.equal(spiral.controls[1].format(137.5), "137.50°");
  assert.equal(spiral.alternate, null);
  assert.equal(spiral.maxEmoji, 6);
  assert.equal(spiral.overlap, 0);
});

test("defaults: center first, seeds on the Vogel spiral, nothing shrinks", () => {
  const { placements, groups } = spiral.layout(base);
  assert.deepEqual(placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.deepEqual(groups[0], { size: 1, kind: "solid", slot: 0 });
  const seeds = seedsOf(placements);
  assert.ok(seeds.length >= 140 && seeds.length < 144, `${seeds.length} seeds (a few dropped next to the center)`);
  for (const p of seeds) {
    assert.equal(p.scale, 1);
    // seed i sits at radius R·sqrt(i/n) and angle i·divergence; heading = angle
    const i = Math.round((Math.hypot(p.x, p.y) / base.radius) ** 2 * 144);
    const a = i * 137.5 * Math.PI / 180;
    assert.ok(Math.abs(p.heading - a) < 1e-9, `seed ${i}`);
    assert.ok(Math.abs(p.x - Math.cos(a) * base.radius * Math.sqrt(i / 144)) < 1e-6);
  }
});

test("bands: equal-count solid groups, inside out, after the center", () => {
  for (const bands of [1, 2, 3, 5]) {
    const { placements, groups } = spiral.layout({ ...base, bands });
    assert.equal(groups.length, 1 + bands);
    groups.slice(1).forEach(g => assert.deepEqual(g, { size: 1, kind: "solid" }));
    const counts = groups.slice(1).map((_, b) => placements.filter(p => p.group === b + 1).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `bands ${bands}: ${counts}`);
    // band b+1 lies entirely outside band b
    for (let b = 1; b < bands; b++) {
      const r = g => placements.filter(p => p.group === g).map(p => Math.hypot(p.x, p.y));
      assert.ok(Math.max(...r(b)) <= Math.min(...r(b + 1)));
    }
    assert.ok(seedsOf(placements).every(p => p.index === 0));
  }
});

test("empty center: no center group, no seeds dropped", () => {
  const { placements, groups } = spiral.layout({ ...base, centerMode: "empty" });
  assert.equal(groups.length, 3);
  assert.equal(placements.length, 144);
  assert.ok(placements.every(p => p.heading !== null));
});

test("crowded: fewer seeds at the floor scale, never overlapping", () => {
  const p = { ...base, seeds: 300, emojiSize: 80, radius: 500 - 80 * 0.9 };
  const { placements } = spiral.layout(p);
  const seeds = seedsOf(placements);
  const floor = fitFloor(80, 14);
  assert.ok(seeds.length < 290, `${seeds.length} seeds`);
  // the largest count that fits: scale sits just above the floor
  assert.ok(seeds.every(q => q.scale >= floor && q.scale < floor + 0.02), `scale ${seeds[0].scale}`);
  // one more seed would not fit: the same layout with an empty center keeps every seed
  const n = spiral.layout({ ...p, centerMode: "empty" }).placements.length;
  const more = spiral.layout({ ...p, seeds: n + 1, centerMode: "empty" }).placements.length;
  assert.equal(more, n, "n + 1 seeds would be crowded, so it fits n");
});

// Spec §7 sweep: every pair of placements.
test("sweep: finite, inside radius, groups cover indices, no overlaps, scale >= font floor", () => {
  for (const seeds of [40, 100, 144, 220, 300]) for (const divergence of [137, 137.5, 138]) for (const bands of [1, 3, 5])
  for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 44, 80]) {
    const radius = 500 - emojiSize * 0.9, minFont = 14;
    const tag = JSON.stringify({ seeds, divergence, bands, centerMode, emojiSize });
    const { placements: P, groups } = spiral.layout({ seeds, divergence, bands, centerMode, radius, emojiSize, minFont });
    assert.ok(seedsOf(P).length >= 3 * bands, tag + " enough seeds");
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
      assert.ok(d >= 0.95 * emojiSize * (P[i].scale + P[j].scale) / 2 * (1 - spiral.overlap), tag);
    }
  }
});
