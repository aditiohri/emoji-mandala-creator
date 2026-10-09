import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPES, getShape, defaultParams, randomParams } from "../js/shapes/index.js";
import rings from "../js/shapes/rings.js";
import spiral from "../js/shapes/spiral.js";
import lotus from "../js/shapes/lotus.js";
import yantra from "../js/shapes/yantra.js";

test("registry order and lookup", () => {
  assert.deepEqual(SHAPES.map(s => s.id), ["rings", "spiral", "lotus", "yantra"]);
  assert.equal(getShape("spiral"), spiral);
  assert.equal(getShape("lotus"), lotus);
  assert.equal(getShape("yantra"), yantra);
  assert.equal(getShape("nope"), rings);
});

test("defaultParams: control defaults, plus alternate only if the shape has it", () => {
  assert.deepEqual(defaultParams(rings), { rings: 6, symmetry: 10, spacing: 100, alternate: true });
  assert.deepEqual(defaultParams(spiral), { seeds: 144, divergence: 137.5, bands: 3 });
  assert.deepEqual(defaultParams(lotus), { layers: 2, petals: 8, width: 80, alternate: true });
  assert.deepEqual(defaultParams(yantra), { triangles: 1, petals: 8, alternate: false });
});

// Deterministic stand-in for Math.random.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("randomParams: shuffle range (or full range), on the step grid", () => {
  for (const shape of SHAPES) for (const r of [0, 0.25, 0.5, 0.999999]) {
    const p = randomParams(shape, () => r);
    for (const c of shape.controls) {
      const [lo, hi] = c.shuffle ?? [c.min, c.max];
      assert.ok(p[c.key] >= lo && p[c.key] <= hi, `${shape.id}.${c.key} = ${p[c.key]}`);
      const k = (p[c.key] - c.min) / c.step;
      assert.ok(Math.abs(k - Math.round(k)) < 1e-9, `${shape.id}.${c.key} = ${p[c.key]} off the step grid`);
    }
    assert.equal("alternate" in p, shape.alternate !== null);
  }
  assert.equal(randomParams(spiral, () => 0).divergence, 137);
  assert.equal(randomParams(spiral, () => 0.999999).divergence, 138);
  assert.equal(randomParams(rings, () => 0).rings, 3);
  assert.equal(randomParams(rings, () => 0.999999).rings, 11);
  assert.equal(randomParams(rings, seq(0, 0, 0, 0.9)).alternate, true);
  assert.equal(randomParams(rings, seq(0, 0, 0, 0.1)).alternate, false);
});
