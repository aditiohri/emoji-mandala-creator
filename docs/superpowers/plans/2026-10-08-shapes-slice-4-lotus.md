# Mandala Shapes — Slice 4 (Lotus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third shape, **Lotus**: layers of outlined petals around the
center emoji, with Layers / Petals / Petal width sliders and an "Interleave
petal layers" switch. It appears as a third tile in the shape strip and in
Shuffle, never overlaps beyond its allowed 15 %, and stays symmetric when
crowded.

**Base:** `main` at or after the commit that adds this plan (it also carries
the slice 4 spec update).

**Architecture:** `js/shapes/lotus.js` is a pure layout like `rings.js` and
`spiral.js`. `js/shapes/lib.js` gains `petalCurve` (the petal outline, reused
by yantra in slice 5). Registering the shape in `js/shapes/index.js` is all
the UI needs: the strip, generated sliders, Alternate row and Shuffle are
already driven by the registry (slice 3). No HTML, CSS or `main.js` change.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and
`node:assert/strict`, run with `node --test` (Node 24). Browser checks use
Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`
(§1 decisions incl. **"Crowded groups"** and **"Lotus"**, decided
2026-10-08 from screenshot grids; §3 Shape interface, Fitting; §4 Shape
strip; §5 **Lotus** (rewritten for this slice); §6 item 4; §7). Read it
before starting any task.

**Provenance:** every code block in this plan was run in a scratch copy of
the repo before the plan was written: `node --test` passed (70 tests) and
`slice4.mjs` printed `ALL PASS` for every section, and the orchestrator
looked at every screenshot. The "expected failure" outputs below were
observed too. If something here fails for you, suspect a transcription slip
first, and report it rather than redesigning.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM.
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- At most **6** distinct emoji per shape, first N in palette order (`maxEmoji` 6 for the lotus).
- Fit floor: `floor = max(MIN_SCALE, minFont/emojiSize)`, `MIN_SCALE = 0.55`; center emoji scale is always 1.05.
- Lotus `overlap` is **0.15**: every pair of placements may be as close as `emojiSize·(a+b)/2·(1-0.15)`, measured by the same all-pairs sweep as the other shapes. Nothing is special-cased.
- **Crowded groups** (spec §1): remove elements, keep the structure. The lotus never changes its petal count; a too-narrow petal becomes a spoke; a unit (tip, side pair, spoke emoji) is kept or dropped in every petal at once.
- Copy: shape label **"Lotus"**; control labels **"Layers"**, **"Petals"**, **"Petal width"** (value shown as `80%`); Alternate label **"Interleave petal layers"**.
- Generated slider ids are `shape-layers`, `shape-petals`, `shape-width` (spec §4 `shape-<key>`).
- Duplicates are allowed in the palette (they act as weights); never de-duplicate it.
- Every UI check uses **real Playwright locator clicks, taps, mouse drags, key presses or CDP touches on the visible element**. Never set `.checked`/`.value` or call `el.click()` from `page.evaluate`.
- Worktree agents must first check that `js/shapeControls.js`, `js/shapes/spiral.js`, `js/shapes/lib.js`, `js/pattern.js` and `tests/registry.test.mjs` exist and that `git log --oneline -3` shows the slice 4 plan commit. If not, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`. macOS has no `timeout` command.
- After any Playwright run, check `ps aux | grep -E "[h]eadless|[s]lice4"` and kill leftovers.
- `~/.tools/playwright/slice4.mjs` (outside the repo) was written and run while planning; **do not edit it**. It supersedes `slice3.mjs` (three shapes). Sections: 1 every control, 2 strip + generated sliders for every shape, 3 palette, 4 Shuffle, 5 toggles, 6 screenshots per shape, 7 thumbnail cost. `ONLY=1,2` runs just those; a full run takes several minutes.

## Review Focus

Failure modes the per-task unit tests could miss, each with its owning check:

1. **The Alternate switch is per shape.** Turning Interleave off on the lotus must not turn off the rings' Stagger, and each shape must come back with its own switch state and the same canvas. → Task 2, `slice4.mjs` section 2 (`rings Alternate still on (lotus's switch didn't leak)`, `lotus remembers its Alternate switch`, `lotus canvas is as it was`).
2. **Crowding must keep every petal mirror-symmetric.** Dropping one side of a side pair (an earlier prototype did) leaves lopsided petals. → Task 1, `lotus.test.mjs` (`each layer is rotationally symmetric and every petal mirror-symmetric`).
3. **Shuffle must reach the lotus** and leave strip, sliders, value labels (`80%`) and the Alternate label consistent with it. → Task 2, section 4 (30 real clicks, `Shuffle picked every shape`).
4. **The width slider can stop mattering when crowded** (its cap takes over), like rings' spacing. Accepted; the slider checks run where it acts (section 2 clicks it at 20 % of the track). → Task 2, section 2 (`slider shape-width: click moves it ... redraws`).
5. **Three thumbnails redraw on every draw** (slice 3 carry-over). Measured at about 1 ms, so they stay. → Task 2, section 7 (`three thumbnails redraw in ... ms (< 8 ms)`).

Also pinned by unit tests: no overlaps beyond 0.15 and full petal count over
every slider value combination (`lotus.test.mjs` sweep, 648 combinations);
odd petal counts (5, 7) included.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/shapes/lib.js` | modify | add `petalCurve(B, T, phiMax)` |
| `js/shapes/lotus.js` | create | Lotus layout (pure) |
| `js/shapes/index.js` | modify | register lotus after spiral |
| `tests/lotus.test.mjs` | create | lotus layout, symmetry, crowding, sweep |
| `tests/registry.test.mjs` | modify | three shapes; lotus defaults |
| `ROADMAP.md`, spec | modify (Task 3) | tick slice 4, record carry-overs |

`polygonPoints` is **not** added: only yantra needs it (spec §6, decided in
the slice 4 design).

**Models (keep usage low):** implementers — Task 1 and Task 2 Haiku (the
code is given verbatim). Task reviewers — Sonnet after Task 1 (the geometry
is the heart of the slice), Haiku after Task 2. Escalate a Haiku task to
Sonnet only if it fails twice. The whole-branch review before merge is the
one Opus call. Task 3's screenshot judgement is the orchestrator's, not a
subagent's.

---

### Task 0: Worktree

- [ ] **Step 1:** Use superpowers:using-git-worktrees. Create branch `shapes-slice-4` from `main` (which includes this plan and the spec update). Run the Global Constraints file check.
- [ ] **Step 2:** Run `node --test`. Expected: all pass (61 tests).

---

### Task 1: `petalCurve` and the lotus layout

Spec §5 "Lotus". Bands from the center emoji to `radius` with weights 2, 3,
4; a layer's ring of tips sets its scale (`fitRing`); the petal outline is
`petalCurve`, its width capped so neighbours' widest points clear each
other; a petal too narrow for two sides is a spoke; units (tip, side pair,
spoke emoji) are kept only if they clear the inner layers and every kept
point in every petal, so the same units are kept in every petal. The tip
failing drops the layer.

**Files:**
- Modify: `js/shapes/lib.js` (append `petalCurve`)
- Create: `js/shapes/lotus.js`, `tests/lotus.test.mjs`

**Interfaces:**
- Consumes: `polar(r, angle)`, `fitFloor(emojiSize, minFont)`, `fitRing({ r, count, emojiPx, overlap, floor }) → { count, scale }` from `lib.js` (unchanged).
- Produces:
  - `petalCurve(B, T, phiMax) → (t) => { r, phi }` in `lib.js`.
  - `lotus` (default export of `js/shapes/lotus.js`): `{ id: "lotus", label: "Lotus", controls: [layers, petals, width], alternate: { label: "Interleave petal layers", default: true }, maxEmoji: 6, overlap: 0.15, layout(params) }`; `controls[2].format(80) → "80%"`. `layout` returns `{ placements, groups }` as spec §3; groups are the center (if shown), then per layer a tips `cycle` group of size `P` and, unless only tips survived, a sides `cycle` group of size `P`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lotus.test.mjs`:

```js
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
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `tests/lotus.test.mjs` fails to load, everything else passes:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../js/shapes/lotus.js' imported from .../tests/lotus.test.mjs
✖ tests/lotus.test.mjs
ℹ tests 62
ℹ pass 61
ℹ fail 1
```

- [ ] **Step 3: Implement**

Append to `js/shapes/lib.js`:

```js
// Lotus petal outline on axis angle 0, from its base (radius B) to its tip
// (radius T): t in [0, 1] -> { r, phi }, phi the angle off the petal's axis.
// The base is open (phi = 0.71·phiMax), the petal is widest a third of the
// way up (phi = phiMax) and pointed at the tip (phi = 0).
export function petalCurve(B, T, phiMax){
  return t => ({ r: B + t * (T - B), phi: phiMax * Math.sin(Math.PI * (0.25 + 0.75 * t)) });
}
```

Create `js/shapes/lotus.js`:

```js
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
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass (70 tests). The lotus sweep checks every pair
of placements over 648 combinations in well under a second. The app is
unchanged in the browser (the lotus is registered in Task 2).

- [ ] **Step 5: Commit**

```bash
git add js/shapes/lib.js js/shapes/lotus.js tests/lotus.test.mjs
git commit -m "Add the lotus shape: outlined petals, wider outer bands, spokes when crowded (petalCurve)"
```

---

### Task 2: Register the lotus (strip tile, sliders, Shuffle)

Registering the shape is the whole UI change: slice 3's strip, generated
sliders, Alternate row and Shuffle read `SHAPES`.

**Files:**
- Modify: `js/shapes/index.js`, `tests/registry.test.mjs`

**Interfaces:**
- Consumes: `lotus` from Task 1.
- Produces: `SHAPES = [rings, spiral, lotus]`; `getShape("lotus") === lotus`; `defaultParams(lotus) → { layers: 2, petals: 8, width: 80, alternate: true }`.

- [ ] **Step 1: Write the failing tests**

In `tests/registry.test.mjs`:

1. After `import spiral from "../js/shapes/spiral.js";` add
   ```js
   import lotus from "../js/shapes/lotus.js";
   ```
2. In `registry order and lookup`, change the first assertion to
   ```js
     assert.deepEqual(SHAPES.map(s => s.id), ["rings", "spiral", "lotus"]);
   ```
   and add, before `assert.equal(getShape("nope"), rings);`,
   ```js
     assert.equal(getShape("lotus"), lotus);
   ```
3. In `defaultParams: ...`, after the spiral line add
   ```js
     assert.deepEqual(defaultParams(lotus), { layers: 2, petals: 8, width: 80, alternate: true });
   ```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: 1 failure out of 70, `registry order and lookup`:
```
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected
...
-   'lotus'
```

Run: `cd ~/.tools/playwright && ONLY=2 node slice4.mjs <worktree> <scratch>/s4`
Expected (about 40 s):
```
FAIL desktop: strip has a button per shape ([["rings","Concentric rings","BUTTON"],["spiral","Phyllotaxis spiral","BUTTON"]])
FAIL desktop: thumbnails drawn and all different
```
then the script exits with `locator.click: Timeout 30000ms exceeded ... waiting for locator('#shapeStrip .shape-tile[data-shape="lotus"]')`. Check `ps` for leftover Chromium.

- [ ] **Step 3: Implement**

`js/shapes/index.js`: after `import spiral from "./spiral.js";` add

```js
import lotus from "./lotus.js";
```

and change `export const SHAPES = [rings, spiral];` to

```js
export const SHAPES = [rings, spiral, lotus];
```

- [ ] **Step 4: Run the tests**

Run: `node --test` → all pass (70).
Run: `cd ~/.tools/playwright && ONLY=1,2,4,7 node slice4.mjs <worktree> <scratch>/s4` → every line `PASS`, final `ALL PASS`, including
`desktop: lotus sliders generated`,
`phone: slider shape-width: tap moves it (80 -> 41), label "41%", redraws`,
`desktop: rings Alternate still on (lotus's switch didn't leak)`,
`Shuffle picked every shape in 30 clicks (rings,spiral,lotus)`,
`three thumbnails redraw in 1.05 ms (< 8 ms)` (the number varies).
Check `ps` for leftover Chromium.

- [ ] **Step 5: Commit**

```bash
git add js/shapes/index.js tests/registry.test.mjs
git commit -m "Register the lotus: third strip tile, its sliders, and Shuffle can pick it"
```

---

### Task 3: Browser check, screenshot review, merge (orchestrator)

This task is done by the orchestrating session, not a subagent: it must look
at every screenshot itself.

- [ ] **Step 1:** In the worktree, `node --test` → all pass (70). Run
`cd ~/.tools/playwright && node slice4.mjs <worktree> <scratch>/slice4`
(all sections, several minutes; run it in the background) → `ALL PASS`,
exit 0. Paste the non-`wrote` output into the report to the user. Check
`ps` for leftovers.

- [ ] **Step 2: Judge by eye** (Read each PNG):
  - `crowded-lotus-{desktop,phone}.png` (layers 1–3, petals 4–16, width
    30–90, emoji size 20–80): every layer has its full petal count; each
    petal mirror-symmetric; narrow petals as spokes; nothing overlapping
    beyond a light touch; nothing clipped at the edge.
  - `extremes-lotus-*.png` (defaults + 16 slider corners): as above. Known
    and accepted: 3 layers × 4 petals at width 90 makes broad, bowl-shaped
    outer petals whose bases open where they meet the inner layer.
  - `crowded-*` / `extremes-*` for rings and spiral: unchanged from slice 3.
  - `toggles.png` (rings) unchanged; `toggles-lotus.png`: Interleave off
    lines the outer petals up behind the inner ones; Face outward turns each
    petal's emoji along its axis.
  - `strip-{desktop,phone}.png`: three round tiles, the pressed one ringed
    in coral; the lotus tile reads as a flower.
  - `page-{desktop,phone}.png`: no horizontal scroll; strip wraps if needed.
  If anything needs squinting or looks wrong, stop and ask the user.
- [ ] **Step 3:** Request a whole-branch review (superpowers:requesting-code-review, Opus reviewer) against this plan and the spec; fix findings; re-run `node --test` and the affected `slice4.mjs` sections.
- [ ] **Step 4:** Update `ROADMAP.md`: tick **Slice 4** (merged date; one
  line on what shipped; checked by `slice4.mjs`), resolve its open
  questions (all decided, spec §1 "Lotus"), note the thumbnail carry-over
  closed (about 1 ms for three tiles), and move the slice 3 minors that are
  still open. Update the browser-testing memory note: `slice4.mjs`
  supersedes `slice3.mjs`, has a `SHAPES` table to extend for slices 5–6,
  and a per-shape `frac` for click positions when a slider's 80 % point is
  its current value.
- [ ] **Step 5:** superpowers:finishing-a-development-branch → merge `shapes-slice-4` into `main`. Do not push (the user pushes).
