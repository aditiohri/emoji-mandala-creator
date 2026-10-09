import { test } from "node:test";
import assert from "node:assert/strict";
import lotus from "../js/shapes/lotus.js";
import { petalCurve, fitFloor } from "../js/shapes/lib.js";

const base = { layers: 2, petals: 8, width: 80, alternate: true, centerMode: "emoji", radius: 460.4, emojiSize: 44, minFont: 14 };
const angleOf = p => Math.atan2(p.y, p.x);
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
// Rotate a placement by angle a about the center.
const rot = (p, a) => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

test("lotus controls match the spec", () => {
  assert.equal(lotus.id, "lotus");
  assert.equal(lotus.label, "Lotus");
  assert.deepEqual(lotus.controls.map(c => [c.key, c.label, c.min, c.max, c.step, c.default]),
    [["layers", "Layers", 1, 3, 1, 2], ["petals", "Petals", 4, 16, 1, 8], ["width", "Petal width", 30, 90, 1, 80]]);
  assert.equal(lotus.controls[2].format(80), "80%");
  assert.deepEqual(lotus.alternate, { label: "Interleave petal layers", default: true });
  assert.equal(lotus.maxEmoji, 6);
  assert.equal(lotus.overlap, 0.15);
});

test("petalCurve: open base, widest a third of the way up, pointed tip", () => {
  const c = petalCurve(100, 400, 0.3);
  assert.deepEqual(c(1).r, 400);
  assert.ok(Math.abs(c(1).phi) < 1e-12);
  assert.equal(c(0).r, 100);
  assert.ok(near(c(0).phi, 0.3 * Math.SQRT1_2));
  assert.ok(near(c(1 / 3).phi, 0.3));
  for (const t of [0.1, 0.5, 0.9]) assert.ok(c(t).phi < 0.3);
});

test("defaults: center, then per layer a tips group and a sides group of 8", () => {
  const { placements, groups } = lotus.layout(base);
  assert.deepEqual(placements[0], { x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
  assert.deepEqual(groups, [{ size: 1, kind: "solid", slot: 0 },
    { size: 8, kind: "cycle" }, { size: 8, kind: "cycle" }, { size: 8, kind: "cycle" }, { size: 8, kind: "cycle" }]);
  // outer layer: full scale, tips on the radius, petal axes every 45° offset by half a petal (Interleave)
  const tips = placements.filter(p => p.group === 3);
  assert.equal(tips.length, 8);
  tips.forEach(p => {
    assert.equal(p.scale, 1);
    assert.ok(near(Math.hypot(p.x, p.y), base.radius));
    assert.ok(near(p.heading, 2 * Math.PI * p.index / 8 + Math.PI / 8));
    assert.ok(near(Math.cos(p.heading) * Math.hypot(p.x, p.y), p.x), "tip sits on its petal's axis");
  });
  // inner layer is not offset
  placements.filter(p => p.group === 1).forEach(p => assert.ok(near(p.heading, 2 * Math.PI * p.index / 8)));
  // outer petals are outlined: several side pairs per petal
  assert.ok(placements.filter(p => p.group === 4 && p.index === 0).length >= 10);
});

test("each layer is rotationally symmetric and every petal mirror-symmetric", () => {
  for (const [layers, petals, width] of [[2, 8, 80], [3, 5, 90], [1, 12, 30], [3, 16, 60]]) {
    const { placements } = lotus.layout({ ...base, layers, petals, width });
    const P = placements.filter(p => p.heading !== null);
    const has = q => P.some(o => near(o.x, q.x, 1e-6) && near(o.y, q.y, 1e-6));
    for (const p of P) {
      assert.ok(has(rot(p, 2 * Math.PI / petals)), `rotation ${layers}/${petals}/${width}`);
      // mirror across the petal's own axis
      const a = 2 * p.heading - angleOf(p), r = Math.hypot(p.x, p.y);
      assert.ok(has({ x: r * Math.cos(a), y: r * Math.sin(a) }), `mirror ${layers}/${petals}/${width}`);
      // both sides of petal j share index j (index = petal number)
      const j = Math.round(((p.heading - P.find(o => o.group === p.group && o.index === 0).heading) * petals / (2 * Math.PI)));
      assert.equal(((j % petals) + petals) % petals, p.index);
    }
  }
});

test("width: a wider petal spreads further from its axis", () => {
  const spread = w => Math.max(...lotus.layout({ ...base, layers: 1, width: w }).placements
    .filter(p => p.index === 0 && p.heading !== null).map(p => Math.abs(angleOf(p) - p.heading)));
  assert.ok(spread(30) < spread(60) && spread(60) < spread(90), `${spread(30)} ${spread(60)} ${spread(90)}`);
});

test("alternate off: no layer is offset", () => {
  const { placements } = lotus.layout({ ...base, alternate: false });
  placements.filter(p => p.heading !== null).forEach(p => assert.ok(near(p.heading, 2 * Math.PI * p.index / 8)));
});

test("empty center: no center group", () => {
  const { placements, groups } = lotus.layout({ ...base, centerMode: "empty" });
  assert.equal(groups.length, 4);
  assert.ok(placements.every(p => p.heading !== null));
});

test("crowded: petal count never changes; narrow petals become spokes on their axis", () => {
  const p = { ...base, layers: 3, petals: 16, width: 30, emojiSize: 60, radius: 500 - 60 * 0.9 };
  const { placements, groups } = lotus.layout(p);
  assert.ok(groups.filter(g => g.kind === "cycle").every(g => g.size === 16));
  // some layer's non-tip emoji all sit on their petal's axis (a spoke)
  const spokeGroup = groups.findIndex((g, gi) => gi > 0 && placements.some(q => q.group === gi)
    && placements.filter(q => q.group === gi).length > 16
    && placements.filter(q => q.group === gi).every(q => near(angleOf(q), Math.atan2(Math.sin(q.heading), Math.cos(q.heading)), 1e-9)));
  assert.ok(spokeGroup > 0, "a spoke layer");
  const floor = fitFloor(60, 14);
  assert.ok(placements.every(q => q.scale >= floor));
});

// Spec §7 sweep: every pair of placements, overlap 0.15.
test("sweep: finite, inside radius, groups cover indices, no overlaps beyond 0.15, scale >= font floor", () => {
  for (const layers of [1, 2, 3]) for (const petals of [4, 5, 7, 8, 12, 16]) for (const width of [30, 60, 90])
  for (const alternate of [true, false]) for (const centerMode of ["emoji", "empty"]) for (const emojiSize of [20, 44, 80]) {
    const radius = 500 - emojiSize * 0.9, minFont = 14;
    const tag = JSON.stringify({ layers, petals, width, alternate, centerMode, emojiSize });
    const { placements: P, groups } = lotus.layout({ layers, petals, width, alternate, centerMode, radius, emojiSize, minFont });
    assert.ok(groups.some(g => g.kind === "cycle"), tag + " at least one layer");
    for (const p of P) {
      for (const v of [p.x, p.y, p.scale]) assert.ok(Number.isFinite(v), tag);
      assert.ok(Math.hypot(p.x, p.y) <= radius + emojiSize, tag);
      assert.ok(p.scale >= minFont / emojiSize, tag);
    }
    groups.forEach((g, gi) => {
      if (g.kind === "cycle") assert.equal(g.size, petals, tag + " full petal count");
      const idx = new Set(P.filter(p => p.group === gi).map(p => p.index));
      assert.equal(idx.size, g.size, tag);
      for (let i = 0; i < g.size; i++) assert.ok(idx.has(i), tag);
    });
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      assert.ok(d >= 0.95 * emojiSize * (P[i].scale + P[j].scale) / 2 * (1 - lotus.overlap), tag);
    }
  }
});
