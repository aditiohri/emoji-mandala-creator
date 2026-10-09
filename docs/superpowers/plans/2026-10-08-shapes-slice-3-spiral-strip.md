# Mandala Shapes — Slice 3 (Spiral, shape strip, generated controls, Shuffle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People pick between Concentric rings and a new Phyllotaxis spiral
from a strip of live thumbnails; each shape's sliders are generated from the
shape and remembered per shape; Shuffle also picks a shape. Crowded rings are
dropped instead of re-spaced (no more jumbled cores), and on phones a swipe
that starts on a palette chip scrolls the page.

**Base:** `main` at or after `c895a00`, which includes the small-followups
work: the palette may now hold **duplicate emoji** on purpose (they act as
weights), and `main.js` / `palette.js` / `styles.css` gained background and
Browse-feedback changes that this plan's edits do not touch.

**Architecture:** `js/shapes/spiral.js` is a pure layout like `rings.js`.
`js/shapes/index.js` registers both and gains two pure helpers,
`defaultParams(shape)` and `randomParams(shape, rand)`. A new DOM module,
`js/shapeControls.js`, owns the shape strip, the generated sliders and the
Alternate row; `main.js` wires it in and its `draw()` wrapper refreshes the
thumbnails on every redraw. The static Rings / Symmetry / Spacing sliders go.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and
`node:assert/strict`, run with `node --test` (Node 24). Browser checks use
Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`
(§1 decisions incl. **"Crowded groups"** and **"Phone chip drag"**, both
decided 2026-10-08; §3 Shape interface, Fitting, Renderer "Thumbnails",
State; §4 UI; §5 Concentric rings step 5 and Phyllotaxis spiral; §6 item 3;
§7). Read it before starting any task.

**Provenance:** every code block in this plan was run in a scratch copy of
the repo before the plan was written: `node --test` passed (61 tests) and
`slice3.mjs` (Task 3) printed `ALL PASS` (90 checks), and the orchestrator
looked at every screenshot. The "expected failure" outputs below were
observed too. If something here fails for you, suspect a transcription slip
first, and report it rather than redesigning.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM. (`js/shapeControls.js` is a DOM module and may import them.)
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- `draw.js` keeps exporting `canvas`, `ctx`, `initCanvas`, `renderTo`, `draw` (`draw()` returns `{ used }`). `renderTo` is unchanged in this slice.
- At most **6** distinct emoji per shape, first N in palette order (`maxEmoji` 6 for rings and spiral).
- Fit floor: `floor = max(MIN_SCALE, minFont/emojiSize)`, `MIN_SCALE = 0.55`; center emoji scale is always 1.05.
- **Crowded groups** (spec §1): remove elements, keep the structure. A ring that can't hold its full `symmetry` is dropped; the spiral uses the largest seed count that fits and drops seeds that would touch the center emoji.
- Generated slider ids are **`shape-<key>`** and their value labels **`shape-<key>-val`** (spec §4). Static ids that stay: `zoom`, `rotation`, `emojiSize`, `centerMode`, `alternate`, `faceOutward`, `glow`.
- Duplicates are allowed in the palette (small-followups); never de-duplicate it. × buttons name their copy: **"Remove 🌸 (2 of 2)"** when there are several, **"Remove 🌸"** when there is one.
- Copy: shape labels **"Concentric rings"** and **"Phyllotaxis spiral"**; spiral control labels **"Seeds"**, **"Divergence"**, **"Bands"**; divergence shows two decimals and a degree sign (`137.50°`); strip heading **"Shape"**; chip `aria-label` **"✨, position 1 of 8, arrow keys to move"**.
- Palette chips use **`touch-action: pan-y`** (spec §1 "Phone chip drag").
- Every UI check uses **real Playwright locator clicks, taps, mouse drags, key presses or CDP touches on the visible element**. Never set `.checked`/`.value` or call `el.click()` from `page.evaluate`.
- Worktree agents must first check that `js/palette.js`, `js/backgrounds.js`, `js/usage.js`, `js/shapes/rings.js`, `js/shapes/lib.js`, `js/pattern.js` and `js/addnote.js` exist and that `git log --oneline -3` shows the slice 3 plan commit. If not, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`. macOS has no `timeout` command.
- After any Playwright run, check `ps aux | grep -E "[h]eadless|[s]lice3"` and kill leftovers.
- `slice3.mjs` takes a few minutes when run whole (section 6 takes the screenshots). Use `ONLY=1,2` (etc.) to run just the sections a task touches.

## Review Focus

Failure modes the per-task unit tests could miss, each with its owning check:

1. **Switching shapes must keep each shape's own values** and show the right sliders and Alternate row; going back must redraw exactly what was there. → Task 3, `slice3.mjs` section 2 (`rings remembers its value (9)`, `spiral remembers its values`, `rings canvas is as it was`).
2. **A fractional-step slider must start on its value.** Setting `value` before `step` makes the browser snap 137.5 to 138. → Task 3, section 2 (`divergence starts at 137.5`).
3. **Thumbnails must follow the palette and background**, not just render once. → Task 3, section 1 (`background swatch click redraws every shape thumbnail`, `removing the first emoji redraws every shape thumbnail`).
4. **After any Shuffle, strip, sliders, value labels and Alternate row must agree** with the shape Shuffle picked. → Task 3, section 4 (24 real clicks).
5. **Phone: a vertical swipe that starts on a chip must scroll the page**, while a sideways-starting drag still reorders (across rows); arrow keys on a focused × must not move its chip; two copies of an emoji must not sound identical to a screen reader. → Task 4, section 3.

Also pinned by unit tests: crowded rings never leave a mandala with no ring
(`shapes.test.mjs` sweep, "at least one ring"); spiral never overlaps across
its whole control range (`spiral.test.mjs` sweep).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/shapes/rings.js` | modify | drop a ring whose fitted count is below `symmetry` |
| `js/shapes/spiral.js` | create | Phyllotaxis spiral layout (pure) |
| `js/shapes/index.js` | modify | register spiral; `defaultParams`, `randomParams` |
| `js/shapeControls.js` | create | shape strip, thumbnails, generated sliders, Alternate row, `currentParams` |
| `js/main.js` | modify | wire shapeControls; Shuffle picks a shape; remove static rings bindings |
| `js/palette.js` | modify | chip `role`/`aria-label`; × labels tell duplicates apart; × keys don't move chips |
| `index.html` | modify | Shape strip field, `#shapeControls`, `#alternateRow`/`#alternateLabel`; static rings sliders removed |
| `styles.css` | modify | `.shape-strip`, `.shape-tile`, `.shape-controls`; chips `touch-action: pan-y` |
| `tests/shapes.test.mjs` | modify | crowded rings dropped; sweep asserts full symmetry; registry test moves out |
| `tests/spiral.test.mjs` | create | spiral layout + sweep |
| `tests/registry.test.mjs` | create | registry, `defaultParams`, `randomParams` |
| `~/.tools/playwright/slice3.mjs` | create (outside repo) | end-of-slice browser check + screenshots; supersedes `slice2.mjs` (whose rings slider ids no longer exist) |

**Placement of the strip** (a small departure from spec §4's "top of the
controls", flagged for the plan review): the Shape field goes after Quick add
and View zoom, directly above the shape's own sliders, so the palette stays
the first thing in the panel. Task 5 updates spec §4 to match.

**Models (keep usage low):** implementers — Task 1 and Task 4 Haiku (the
code is given verbatim), Tasks 2 and 3 Sonnet. Task reviewers — Haiku after
Tasks 1 and 4, Sonnet after Tasks 2 and 3. Escalate a Haiku task to Sonnet
only if it fails twice. The whole-branch review before merge is the one Opus
call. Task 5's screenshot judgement is the orchestrator's, not a subagent's.

---

### Task 0: Worktree

- [ ] **Step 1:** Use superpowers:using-git-worktrees. Create branch `shapes-slice-3` from `main` (which includes this plan and the spec updates). Run the Global Constraints file check.
- [ ] **Step 2:** Run `node --test`. Expected: all pass (53 tests: the slice 2 suite plus small-followups).

---

### Task 1: Crowded rings are dropped, not re-spaced

Spec §1 "Crowded groups" and §5 rings step 5: a ring that can't hold its
full `symmetry` at the floor scale is dropped. Slice 2 re-spaced it with
fewer emoji (`fitRing`'s count), which made crowded cores read as a scatter
of unrelated counts (8, 15, 21 around 24 spokes). `fitRing` itself is
unchanged.

**Files:**
- Modify: `js/shapes/rings.js` (the `fitRing` call inside the ring loop)
- Modify: `tests/shapes.test.mjs`

**Interfaces:**
- Consumes: `fitRing({ r, count, emojiPx, overlap, floor }) → { count, scale }` (unchanged).
- Produces: `rings.layout` where every `cycle` group has `size === symmetry`.

- [ ] **Step 1: Write the failing tests**

In `tests/shapes.test.mjs`:

1. Change the lib import to `import { polar } from "../js/shapes/lib.js";` (`fitFloor` is no longer used).
2. Replace the whole test `crowded ring is re-spaced evenly with fewer emoji, at the floor scale` with:

```js
test("crowded rings are dropped, never re-spaced: every ring has the full symmetry", () => {
  const p = { ...base, rings: 12, symmetry: 24, emojiSize: 80, radius: 500 - 80 * 0.9 };
  const { placements, groups } = rings.layout(p);
  const ringGroups = groups.filter(g => g.kind === "cycle");
  assert.ok(ringGroups.length < 12, "some inner rings were dropped");
  assert.ok(ringGroups.every(g => g.size === 24));
  // The dropped rings are the inner ones: what remains starts well clear of the center.
  const inner = Math.min(...placements.filter(q => q.heading !== null).map(q => Math.hypot(q.x, q.y)));
  assert.ok(inner > 150, `innermost ring at ${inner}`);
});
```

3. In the sweep test, inside `groups.forEach((g, gi) => {`, directly after `assert.ok(g.size >= 1, tag);`, add:

```js
      if (g.kind === "cycle") assert.equal(g.size, sym, tag + " full symmetry");
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: 2 failures — `crowded rings are dropped, never re-spaced: every ring has the full symmetry`, and the sweep with
`AssertionError [ERR_ASSERTION]: {"r":2,"sym":16,"sp":50,"alternate":true,"centerMode":"emoji","emojiSize":80} full symmetry`.

- [ ] **Step 3: Implement**

In `js/shapes/rings.js`, replace

```js
      const fit = fitRing({ r, count: symmetry, emojiPx: emojiSize, overlap, floor });
      if (fit.count === 0) continue;
      const n = fit.count;
```

with

```js
      // Crowded: a ring that can't hold its full symmetry is dropped, never
      // re-spaced with fewer emoji (spec §1 "Crowded groups").
      const fit = fitRing({ r, count: symmetry, emojiPx: emojiSize, overlap, floor });
      if (fit.count < symmetry) continue;
      const n = symmetry;
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass (53 tests).

- [ ] **Step 5: Commit**

```bash
git add js/shapes/rings.js tests/shapes.test.mjs
git commit -m "Rings: drop a crowded ring instead of re-spacing it with fewer emoji"
```

---

### Task 2: Phyllotaxis spiral and the shape registry helpers

Spec §5 "Phyllotaxis spiral": seed `i = 1..n` at angle `i·divergence`,
radius `R·√(i/n)` with `R = radius`, heading = angle. Groups: center (if
shown), then `bands` `solid` groups splitting the remaining seeds into
equal-count runs by index. Fit: shrink every seed to the minimum
nearest-neighbour distance; if that is below the floor, use the **largest**
`n ≤ seeds` that fits at the floor (the nearest-neighbour distance scales
like `1/√n`, so jump to the estimate `n·(d/need)²`, then step down while it
doesn't fit and up while `n+1` still fits). Seeds closer to the center emoji
than `emojiSize·(1.05 + scale)/2` are dropped. Alternate: `null`.

`defaultParams` / `randomParams` are pure (Task 3's UI and Shuffle use
them); `randomParams` takes `rand` so tests are deterministic.

**Files:**
- Create: `js/shapes/spiral.js`, `tests/spiral.test.mjs`, `tests/registry.test.mjs`
- Modify: `js/shapes/index.js`, `tests/shapes.test.mjs` (the registry test moves to `registry.test.mjs`)

**Interfaces:**
- Consumes: `polar(r, angle)`, `fitFloor(emojiSize, minFont)` from `lib.js`.
- Produces:
  - `spiral` (default export): `{ id: "spiral", label: "Phyllotaxis spiral", controls: [seeds, divergence, bands], alternate: null, maxEmoji: 6, overlap: 0, layout(params) }`; `controls[1].format(v) → "137.50°"`.
  - `SHAPES = [rings, spiral]`; `getShape(id)` (unknown id → rings).
  - `defaultParams(shape) → { [key]: default, ..., alternate? }` — `alternate` only when `shape.alternate` is not null.
  - `randomParams(shape, rand) → params` — each control in `c.shuffle ?? [c.min, c.max]`, on the step grid; `alternate: rand() > 0.4` when supported.

- [ ] **Step 1: Write the failing tests**

Create `tests/spiral.test.mjs`:

```js
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
```

Create `tests/registry.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHAPES, getShape, defaultParams, randomParams } from "../js/shapes/index.js";
import rings from "../js/shapes/rings.js";
import spiral from "../js/shapes/spiral.js";

test("registry order and lookup", () => {
  assert.deepEqual(SHAPES.map(s => s.id), ["rings", "spiral"]);
  assert.equal(getShape("spiral"), spiral);
  assert.equal(getShape("nope"), rings);
});

test("defaultParams: control defaults, plus alternate only if the shape has it", () => {
  assert.deepEqual(defaultParams(rings), { rings: 6, symmetry: 10, spacing: 100, alternate: true });
  assert.deepEqual(defaultParams(spiral), { seeds: 144, divergence: 137.5, bands: 3 });
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
```

In `tests/shapes.test.mjs`, delete the `registry` test (it now lives in
`registry.test.mjs`) and the now-unused line
`import { SHAPES, getShape } from "../js/shapes/index.js";`.

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `spiral.test.mjs` and `registry.test.mjs` fail to load
(`Cannot find module '.../js/shapes/spiral.js'`).

- [ ] **Step 3: Implement**

Create `js/shapes/spiral.js`:

```js
import { polar, fitFloor } from "./lib.js";

const CENTER_SCALE = 1.05;

// Seed i = 1..n at angle i·divergence, radius R·√(i/n) (Vogel's model).
function seedPoints(n, R, divergence){
  const a = divergence * Math.PI / 180;
  return Array.from({ length: n }, (_, k) => {
    const i = k + 1, angle = i * a;
    return { ...polar(R * Math.sqrt(i / n), angle), heading: angle };
  });
}

// Smallest distance between any two points (brute force; n ≤ 300).
function minDistance(P){
  let m = Infinity;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++){
    m = Math.min(m, Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y));
  }
  return m;
}

export default {
  id: "spiral",
  label: "Phyllotaxis spiral",
  controls: [
    { key: "seeds",      label: "Seeds",      min: 40,  max: 300, step: 1,    default: 144,
      shuffle: [60, 260] },
    { key: "divergence", label: "Divergence", min: 137, max: 138, step: 0.05, default: 137.5,
      format: v => v.toFixed(2) + "°" },
    { key: "bands",      label: "Bands",      min: 1,   max: 5,   step: 1,    default: 3,
      shuffle: [2, 5] },
  ],
  alternate: null,
  maxEmoji: 6,
  overlap: 0,
  layout({ seeds, divergence, bands, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont);
    const need = floor * emojiSize * (1 - this.overlap);
    // Crowded: the most seeds (≤ `seeds`) that fit at the floor, same spiral
    // (spec §1 "Crowded groups"). Spacing scales like 1/√n: jump to the
    // estimate, then step up or down to the largest n that fits.
    let n = seeds, P = seedPoints(n, radius, divergence), d = minDistance(P);
    if (d < need){
      const fits = m => minDistance(seedPoints(m, radius, divergence)) >= need;
      n = Math.min(seeds - 1, Math.max(3, Math.floor(n * (d / need) ** 2)));
      while (n > 3 && !fits(n)) n--;
      while (n + 1 < seeds && fits(n + 1)) n++;
      P = seedPoints(n, radius, divergence); d = minDistance(P);
    }
    const scale = Math.max(floor, Math.min(1, d / (emojiSize * (1 - this.overlap))));

    const placements = [], groups = [];
    let kept = P;
    if (centerMode === "emoji"){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, group: 0, index: 0 });
      // Seeds that would touch the center emoji are dropped.
      const clear = emojiSize * (CENTER_SCALE + scale) / 2 * (1 - this.overlap);
      kept = P.filter(p => Math.hypot(p.x, p.y) >= clear);
    }
    // Bands: equal-count runs by seed index, i.e. equal-area annuli.
    const B = Math.min(bands, kept.length), g0 = groups.length;
    for (let b = 0; b < B; b++) groups.push({ size: 1, kind: "solid" });
    kept.forEach((p, k) => placements.push({
      x: p.x, y: p.y, heading: p.heading, scale, group: g0 + Math.floor(k * B / kept.length), index: 0,
    }));
    return { placements, groups };
  },
};
```

`js/shapes/index.js` becomes:

```js
import rings from "./rings.js";
import spiral from "./spiral.js";

// Ordered list of shapes, as shown in the UI.
export const SHAPES = [rings, spiral];

export function getShape(id){
  return SHAPES.find(s => s.id === id) ?? SHAPES[0];
}

// A shape's control defaults, plus `alternate` if the shape supports it.
export function defaultParams(shape){
  const p = Object.fromEntries(shape.controls.map(c => [c.key, c.default]));
  if (shape.alternate) p.alternate = shape.alternate.default;
  return p;
}

// Random values for Shuffle: each control within its `shuffle` range (or its
// full range), on its step grid; random Alternate if supported.
// `rand` returns [0, 1), like Math.random.
export function randomParams(shape, rand){
  const p = {};
  for (const c of shape.controls){
    const [lo, hi] = c.shuffle ?? [c.min, c.max];
    const steps = Math.round((hi - lo) / c.step);
    const v = lo + Math.floor(rand() * (steps + 1)) * c.step;
    p[c.key] = Number(v.toFixed(6));
  }
  if (shape.alternate) p.alternate = rand() > 0.4;
  return p;
}
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass (61 tests). The spiral sweep checks every
pair of placements over 270 combinations; it takes well under a second.
The app is unchanged in the browser (the strip comes in Task 3), and
`state.shape` stays `"rings"`.

- [ ] **Step 5: Commit**

```bash
git add js/shapes/spiral.js js/shapes/index.js tests/spiral.test.mjs tests/registry.test.mjs tests/shapes.test.mjs
git commit -m "Add the phyllotaxis spiral shape and registry helpers (defaultParams, randomParams)"
```

---

### Task 3: Shape strip, generated per-shape sliders, Shuffle picks a shape

Spec §4: a "Shape" field holds a strip of ~72px canvas tiles (buttons,
`aria-pressed`, `aria-label` = shape label) drawn with each shape's defaults
and the current palette, background and glow (spec §3 "Thumbnails"); the
Rings / Symmetry / Spacing sliders are replaced by a container filled from
`shape.controls` (ids `shape-<key>`, `shape-<key>-val`); the Alternate
switch's label comes from `shape.alternate.label` and its row is hidden when
the shape has none; each shape keeps its own values for the session; Shuffle
picks a random shape, then random values for its controls.

Implementation notes:
- `currentParams()` fills `state.shapeParams[state.shape]` from
  `defaultParams` on first visit, so `draw()` always finds params.
- When creating a range input, set `min`, `max`, `step` **before**
  `value`, or the browser snaps 137.5 to 138 (Review Focus 2).
- The `draw()` wrapper in `main.js` redraws the thumbnails on every redraw.
  That is the simplest way to follow palette, background, glow and theme
  changes, and it is cheap (two 144px canvases; the spiral fit at thumbnail
  size needs no seed reduction).

**Files:**
- Create: `js/shapeControls.js`, `~/.tools/playwright/slice3.mjs`
- Modify: `index.html`, `js/main.js`, `styles.css`

**Interfaces:**
- Consumes: `SHAPES`, `getShape`, `defaultParams`, `randomParams` (Task 2); `renderTo`, `canvas` from `draw.js`; `state`.
- Produces (`js/shapeControls.js`): `currentParams() → object`; `renderShapeControls(onChange)`; `renderShapeStrip(onChange)`; `selectShape(id, onChange)`; `syncShapeStrip()`; `drawShapeThumbs()`. `onChange` is `main.js`'s `draw` wrapper. DOM ids: `#shapeStrip` (tiles are `button.shape-tile[data-shape]`), `#shapeControls`, `#alternateRow`, `#alternateLabel`.

- [ ] **Step 1: Write the failing browser test**

Create `~/.tools/playwright/slice3.mjs`:

```js
// usage: node slice3.mjs <app-dir> <out-dir>     (ONLY=2,3 runs just those sections)
// Slice 3 browser check. Drives every control with real mouse clicks, drags,
// keys and touches (never by setting .checked/.value from JS), and writes
// screenshots for a human to judge. Exit 1 if any PASS/FAIL check fails.
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";

const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
fs.mkdirSync(out, { recursive: true });
const T = {".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/json"};
const srv = http.createServer((q, r) => {
  const p = path.join(dir, q.url === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream" }); r.end(d); });
}).listen(0);
const URL_ = `http://localhost:${srv.address().port}/`;
const b = await chromium.launch();
let fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };
const DESKTOP = { width: 1200, height: 900 }, PHONE = { width: 390, height: 844 };
const PHONE_OPTS = { hasTouch: true, isMobile: true };
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;
const want = n => !ONLY || ONLY.includes(n);

// Fresh context per page: empty localStorage -> DEFAULT_PALETTE, System background, glow on.
async function open(viewport, opts = {}) {
  const ctx = await b.newContext({ viewport, colorScheme: "light", ...opts });
  const pg = await ctx.newPage();
  pg.errs = []; pg.on("pageerror", e => pg.errs.push(e.message));
  pg.on("console", m => { if (m.type() === "error") pg.errs.push(m.text()); });
  await pg.goto(URL_); await pg.waitForTimeout(600);
  return pg;
}
const pixels = pg => pg.evaluate(() => document.getElementById("canvas").toDataURL());
const thumbs = pg => pg.$$eval("#shapeStrip canvas", cs => cs.map(c => c.toDataURL()));
const chips = pg => pg.$$eval("#paletteChips .palette-chip > span", s => s.map(x => x.textContent));
const sliderIds = pg => pg.$$eval("#shapeControls input[type=range]", els => els.map(e => e.id));
const pressed = pg => pg.$$eval("#shapeStrip .shape-tile", ts => ts.filter(t => t.getAttribute("aria-pressed") === "true").map(t => t.dataset.shape));
const shot = async (pg, name) => { const f = path.join(out, name + ".png"); await pg.locator("#canvas").screenshot({ path: f }); return f; };
// Real click or tap on a spot along a range input.
async function hit(pg, id, frac, touch) {
  await pg.locator("#" + id).scrollIntoViewIfNeeded();
  const box = await pg.locator("#" + id).boundingBox();
  const x = box.x + box.width * frac, y = box.y + box.height / 2;
  if (touch) await pg.touchscreen.tap(x, y); else await pg.mouse.click(x, y);
  await pg.waitForTimeout(80);
}
// Set a slider by real input: click near the value on the track, then
// arrow keys to land on it exactly.
async function setSlider(pg, id, value) {
  const el = pg.locator("#" + id);
  const [min, max, step] = await el.evaluate(e => [Number(e.min), Number(e.max), Number(e.step) || 1]);
  // Stay inside the track: a click on the box's very edge misses the input.
  await hit(pg, id, Math.min(0.97, Math.max(0.03, (value - min) / (max - min))));
  for (let k = 0; k < 400; k++) {
    const v = Number(await el.inputValue());
    if (Math.abs(v - value) < step / 2) break;
    await pg.keyboard.press(v < value ? "ArrowRight" : "ArrowLeft");
  }
  await pg.waitForTimeout(60);
  const v = Number(await el.inputValue());
  if (Math.abs(v - value) > 1e-9) { fail++; console.log(`FAIL setSlider ${id}: wanted ${value}, got ${v}`); }
}
async function pickShape(pg, id, touch) {
  const tile = pg.locator(`#shapeStrip .shape-tile[data-shape="${id}"]`);
  if (touch) await tile.tap(); else await tile.click();
  await pg.waitForTimeout(100);
}

async function grid(name, cells, w = 300, cols = 4) {
  const html = `<body style="margin:0;background:#ddd;font:13px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px;padding:6px">` +
    cells.map(c => `<div><img src="data:image/png;base64,${fs.readFileSync(c.file).toString("base64")}" style="width:${w}px;height:${w}px;object-fit:contain;background:#fff"><div><b>${c.label}</b></div></div>`).join("") + "</div></body>";
  const pg = await b.newPage({ viewport: { width: cols * (w + 6) + 6, height: 300 } });
  await pg.setContent(html); await pg.waitForTimeout(200);
  const f = path.join(out, name + ".png"); await pg.screenshot({ path: f, fullPage: true }); await pg.close();
  console.log("wrote", f);
}

// 1. Every control by real click (desktop).
if (want(1)) {
  const pg = await open(DESKTOP);
  for (const id of await pg.$$eval(".toggle-row input[type=checkbox]", els => els.map(e => e.id))) {
    for (const [what, sel] of [["pill", `.toggle-row:has(#${id}) .slider-pill`], ["label", `label[for="${id}"]`]]) {
      const before = await pg.isChecked("#" + id), px = await pixels(pg);
      await pg.locator(sel).click({ timeout: 2000 }).catch(() => {});
      await pg.waitForTimeout(80);
      check(await pg.isChecked("#" + id) !== before && (await pixels(pg)) !== px, `switch ${id}: ${what} click flips it and redraws`);
    }
  }
  // Spacing first: once rings are crowded at the minimum size, spacing
  // rightly has no room left to change anything.
  for (const [id, valId, fmt] of [["shape-spacing", "shape-spacing-val", v => (v/100).toFixed(1) + "×"], ["shape-rings", "shape-rings-val", String],
                                  ["shape-symmetry", "shape-symmetry-val", String], ["rotation", "rotVal", v => v + "°"], ["emojiSize", "sizeVal", v => v + "px"]]) {
    const px = await pixels(pg), v0 = await pg.inputValue("#" + id);
    await hit(pg, id, 0.85);
    const v1 = await pg.inputValue("#" + id), label = await pg.textContent("#" + valId);
    check(v1 !== v0 && (await pixels(pg)) !== px && label === fmt(Number(v1)), `slider ${id}: click moves it (${v0} -> ${v1}), label "${label}", redraws`);
  }
  {
    await hit(pg, "zoom", 0.9);
    const t = await pg.$eval(".canvas-wrap", e => e.style.transform);
    check(t.startsWith("scale(") && t !== "scale(1)", `zoom slider: click scales the canvas (${t})`);
    await hit(pg, "zoom", 0.333);
  }
  { const px = await pixels(pg); await pg.selectOption("#centerMode", "empty"); await pg.waitForTimeout(80);
    check((await pixels(pg)) !== px, "center select redraws"); await pg.selectOption("#centerMode", "emoji"); }
  check(await pg.locator("#rings, #symmetry, #spacing").count() === 0, "static rings sliders are gone");
  { const px = await pixels(pg), th = await thumbs(pg); await pg.locator(".bg-preset").nth(2).click(); await pg.waitForTimeout(80);
    check((await pixels(pg)) !== px, "background swatch click redraws");
    check((await thumbs(pg)).every((t, i) => t !== th[i]), "background swatch click redraws every shape thumbnail");
    await pg.locator(".bg-preset").nth(0).click(); }
  { const n = (await chips(pg)).length, th = await thumbs(pg);
    await pg.locator("#paletteChips .palette-chip button").first().click(); await pg.waitForTimeout(80);
    check((await chips(pg)).length === n - 1, "palette × click removes a chip");
    check((await thumbs(pg)).every((t, i) => t !== th[i]), "removing the first emoji redraws every shape thumbnail"); }
  { const n = (await chips(pg)).length; await pg.locator(".emoji-chip:not(.active)").first().click(); await pg.waitForTimeout(80);
    check((await chips(pg)).length === n + 1, "quick-add click adds a chip"); }
  { const px = await pixels(pg); await pg.locator("#shuffle").click(); await pg.waitForTimeout(120);
    check((await pixels(pg)) !== px, "Shuffle click redraws"); }
  { const dl = pg.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await pg.locator("#save").click(); const d = await dl;
    check(d && /^mandala-.*\.png$/.test(d.suggestedFilename()), `Save click downloads a PNG (${d && d.suggestedFilename()})`); }
  { await pg.locator("#browseEmoji").click(); await pg.waitForTimeout(150);
    check(await pg.locator("#emojiDialog").isVisible(), "Browse opens the emoji dialog");
    await pg.locator("#closeEmojiDialog").click(); }
  { await pg.locator(".bg-custom-section summary").click(); const n = await pg.locator(".bg-preset").count();
    await pg.locator("#bgAddCustom").click(); await pg.waitForTimeout(80);
    check(await pg.locator(".bg-preset").count() === n + 1, "Add custom background adds a swatch"); }
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}

// 2. Shape strip and generated sliders, by click (desktop) and tap (phone).
if (want(2)) for (const [vpName, vp, opts, touch] of [["desktop", DESKTOP, {}, false], ["phone", PHONE, PHONE_OPTS, true]]) {
  const pg = await open(vp, opts);
  const tiles = await pg.$$eval("#shapeStrip .shape-tile", ts => ts.map(t => [t.dataset.shape, t.getAttribute("aria-label"), t.tagName]));
  check(JSON.stringify(tiles) === JSON.stringify([["rings", "Concentric rings", "BUTTON"], ["spiral", "Phyllotaxis spiral", "BUTTON"]]), `${vpName}: strip has a button per shape (${JSON.stringify(tiles)})`);
  check(JSON.stringify(await pressed(pg)) === '["rings"]', `${vpName}: rings tile pressed at load`);
  const th = await thumbs(pg);
  check(th[0] !== th[1] && th.every(t => t.length > 3000), `${vpName}: thumbnails drawn and different`);
  check(JSON.stringify(await sliderIds(pg)) === '["shape-rings","shape-symmetry","shape-spacing"]', `${vpName}: rings sliders generated`);
  await setSlider(pg, "shape-rings", 9);
  const ringsPx = await pixels(pg);

  await pickShape(pg, "spiral", touch);
  check(JSON.stringify(await pressed(pg)) === '["spiral"]', `${vpName}: ${touch ? "tap" : "click"} on spiral tile presses it`);
  check(JSON.stringify(await sliderIds(pg)) === '["shape-seeds","shape-divergence","shape-bands"]', `${vpName}: spiral sliders generated`);
  check(JSON.stringify(await pg.$$eval("#shapeControls label", ls => ls.map(l => l.firstChild.textContent.trim()))) === '["Seeds","Divergence","Bands"]', `${vpName}: spiral slider labels`);
  check(await pg.inputValue("#shape-divergence") === "137.5" && await pg.textContent("#shape-divergence-val") === "137.50°", `${vpName}: divergence starts at 137.5 (not snapped to a whole step)`);
  check(await pg.locator("#alternateRow").isHidden(), `${vpName}: Alternate row hidden for spiral`);
  check((await pixels(pg)) !== ringsPx, `${vpName}: canvas redraws as spiral`);
  check((await pg.textContent("#paletteCue")).startsWith("Phyllotaxis spiral is using"), `${vpName}: cue names the spiral`);
  for (const [id, fmt] of [["shape-seeds", String], ["shape-divergence", v => v.toFixed(2) + "°"], ["shape-bands", String]]) {
    const px = await pixels(pg), v0 = await pg.inputValue("#" + id);
    await hit(pg, id, 0.8, touch);
    const v1 = await pg.inputValue("#" + id), label = await pg.textContent(`#${id}-val`);
    check(v1 !== v0 && (await pixels(pg)) !== px && label === fmt(Number(v1)), `${vpName}: slider ${id}: ${touch ? "tap" : "click"} moves it (${v0} -> ${v1}), label "${label}", redraws`);
  }
  const spiralVals = await Promise.all(["shape-seeds", "shape-divergence", "shape-bands"].map(id => pg.inputValue("#" + id)));

  await pickShape(pg, "rings", touch);
  check(JSON.stringify(await pressed(pg)) === '["rings"]', `${vpName}: back to rings`);
  check(await pg.inputValue("#shape-rings") === "9" && await pg.textContent("#shape-rings-val") === "9", `${vpName}: rings remembers its value (9)`);
  check(await pg.locator("#alternateRow").isVisible() && await pg.textContent("#alternateLabel") === "Stagger alternate rings", `${vpName}: Alternate row back, labelled by the shape`);
  check((await pixels(pg)) === ringsPx, `${vpName}: rings canvas is as it was`);
  await pickShape(pg, "spiral", touch);
  const again = await Promise.all(["shape-seeds", "shape-divergence", "shape-bands"].map(id => pg.inputValue("#" + id)));
  check(JSON.stringify(again) === JSON.stringify(spiralVals), `${vpName}: spiral remembers its values (${again})`);
  const sw = await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  check(sw[0] <= sw[1], `${vpName}: no horizontal page scroll (${sw[0]} <= ${sw[1]})`);
  await pg.locator("#shapeStrip").screenshot({ path: path.join(out, `strip-${vpName}.png`) });
  check(pg.errs.length === 0, `${vpName}: no console errors (${pg.errs.join(" | ")})`);
}

// 3. Palette: cue, drag to reorder (mouse, touch), keyboard, ×, phone scroll.
if (want(3)) {
  const pg = await open(DESKTOP);
  const cue = await pg.textContent("#paletteCue");
  check(/^Concentric rings is using 6 of your 8 emoji/.test(cue), `cue at defaults: "${cue}"`);
  check(await pg.locator("#paletteChips .palette-chip.unused").count() === 2, "2 chips dimmed at defaults");
  check(await pg.locator("#paletteChips .palette-chip").first().getAttribute("aria-label") === "✨, position 1 of 8, arrow keys to move", "chip has an accessible name");
  const before = await chips(pg), px = await pixels(pg);
  const last = await pg.locator("#paletteChips .palette-chip").last().boundingBox();
  const first = await pg.locator("#paletteChips .palette-chip").first().boundingBox();
  await pg.mouse.move(last.x + 12, last.y + last.height / 2); await pg.mouse.down();
  for (let k = 1; k <= 10; k++) await pg.mouse.move(last.x + 12 + (first.x + 8 - last.x - 12) * k / 10, last.y + last.height / 2 + (first.y - last.y) * k / 10);
  await pg.mouse.up(); await pg.waitForTimeout(100);
  const after = await chips(pg);
  check(after[0] === before.at(-1) && after.length === before.length, `mouse drag moves last chip to front (${before.join("")} -> ${after.join("")})`);
  check((await pixels(pg)) !== px, "reorder redraws the mandala");
  check(await pg.locator("#paletteChips .palette-chip.unused").count() === 2, "still 2 chips dimmed after reorder");
  await pg.locator("#paletteChips .palette-chip").nth(1).focus(); await pg.keyboard.press("ArrowLeft"); await pg.waitForTimeout(80);
  const keyed = await chips(pg);
  check(keyed[0] === after[1] && keyed[1] === after[0], "ArrowLeft on a focused chip moves it left");
  check(await pg.evaluate(() => document.activeElement.classList.contains("palette-chip")), "focus stays on the moved chip");
  await pg.locator("#paletteChips .palette-chip button").nth(2).focus(); await pg.keyboard.press("ArrowRight"); await pg.waitForTimeout(80);
  check(JSON.stringify(await chips(pg)) === JSON.stringify(keyed), "ArrowRight on a focused × does not move its chip");
  const n = keyed.length; await pg.locator("#paletteChips .palette-chip button").nth(2).click(); await pg.waitForTimeout(80);
  check((await chips(pg)).length === n - 1, "× still removes after drag code is attached");
  // Duplicates are allowed: typing an emoji already in the palette adds a copy,
  // and the two × buttons get different names.
  const dup = (await chips(pg))[0];
  check(await pg.locator("#paletteChips .palette-chip button").first().getAttribute("aria-label") === `Remove ${dup}`, "× label for a single copy");
  await pg.locator("#customEmoji").click(); await pg.keyboard.type(dup); await pg.waitForTimeout(400);
  const labels = await pg.$$eval("#paletteChips .palette-chip button", bs => bs.map(x => x.getAttribute("aria-label")));
  check(labels[0] === `Remove ${dup} (1 of 2)` && labels.at(-1) === `Remove ${dup} (2 of 2)`, `× labels tell duplicates apart (${labels[0]} / ${labels.at(-1)})`);
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}
if (want(3)) {
  const pg = await open(PHONE, PHONE_OPTS);
  const cdp = await pg.context().newCDPSession(pg);
  const touchPath = async pts => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pts[0]] });
    for (const p of pts.slice(1)) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] }); await pg.waitForTimeout(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await pg.waitForTimeout(400);
  };
  const before = await chips(pg);
  // A vertical swipe that starts on a chip scrolls the page and leaves the palette alone.
  const c = await pg.locator("#paletteChips .palette-chip").nth(2).boundingBox();
  const y0 = await pg.evaluate(() => scrollY);
  await touchPath(Array.from({ length: 12 }, (_, k) => ({ x: c.x + c.width / 2, y: c.y + c.height / 2 - k * 20 })));
  const y1 = await pg.evaluate(() => scrollY);
  check(y1 > y0 + 100, `vertical swipe on a chip scrolls the page (scrollY ${y0} -> ${y1})`);
  check(JSON.stringify(await chips(pg)) === JSON.stringify(before), "vertical swipe leaves the palette order alone");
  // A drag that starts sideways reorders, even across rows.
  await pg.locator("#paletteChips").scrollIntoViewIfNeeded(); await pg.waitForTimeout(200);
  const last = await pg.locator("#paletteChips .palette-chip").last().boundingBox();
  const first = await pg.locator("#paletteChips .palette-chip").first().boundingBox();
  check(last.y > first.y + 10, "phone palette wraps to 2+ rows");
  const sx = last.x + 12, sy = last.y + last.height / 2, ex = first.x + 8, ey = first.y + first.height / 2;
  const pts = [{ x: sx, y: sy }]; for (let k = 1; k <= 4; k++) pts.push({ x: sx - k * 5, y: sy });
  for (let k = 1; k <= 10; k++) pts.push({ x: sx - 20 + (ex - sx + 20) * k / 10, y: sy + (ey - sy) * k / 10 });
  await touchPath(pts);
  const after = await chips(pg);
  check(after[0] === before.at(-1), `sideways-start touch drag moves last chip to front, across rows (${before.join("")} -> ${after.join("")})`);
  const n = after.length; await pg.locator("#paletteChips .palette-chip button").first().tap(); await pg.waitForTimeout(80);
  check((await chips(pg)).length === n - 1, "tap on × removes a chip");
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}

// 4. Shuffle picks a shape: 24 real clicks; the strip, sliders and labels follow.
if (want(4)) {
  const pg = await open(DESKTOP);
  const seen = new Set(); let consistent = true;
  for (let k = 0; k < 24; k++) {
    await pg.locator("#shuffle").click(); await pg.waitForTimeout(60);
    const [shape] = await pressed(pg); seen.add(shape);
    const ids = await sliderIds(pg);
    const want = shape === "spiral" ? ["shape-seeds", "shape-divergence", "shape-bands"] : ["shape-rings", "shape-symmetry", "shape-spacing"];
    const labelsOk = await pg.$$eval("#shapeControls input[type=range]", els => els.every(e => {
      const t = document.getElementById(e.id + "-val").textContent; return t.startsWith(String(Number(e.value)).slice(0, 3)) || t.startsWith((e.value / 100).toFixed(1));
    }));
    const altOk = (await pg.locator("#alternateRow").isHidden()) === (shape === "spiral");
    if (JSON.stringify(ids) !== JSON.stringify(want) || !labelsOk || !altOk) { consistent = false; console.log("  mismatch after shuffle", k, shape, ids, labelsOk, altOk); }
  }
  check(seen.size === 2, `Shuffle picked both shapes in 24 clicks (${[...seen]})`);
  check(consistent, "after every Shuffle: one tile pressed, its sliders shown, labels match values, Alternate row matches");
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}

// 5. Each toggle at defaults, before/after, by real click.
if (want(5)) {
  const cells = [];
  for (const [id, name] of [["alternate", "Stagger"], ["faceOutward", "Face outward"], ["glow", "Soft glow"]]) {
    const pg = await open(DESKTOP);
    const s0 = await pg.isChecked("#" + id);
    cells.push({ file: await shot(pg, `toggle-${id}-0`), label: `${name} ${s0 ? "ON" : "OFF"} (default)` });
    await pg.locator(`.toggle-row:has(#${id}) .slider-pill`).click(); await pg.waitForTimeout(80);
    cells.push({ file: await shot(pg, `toggle-${id}-1`), label: `${name} ${s0 ? "OFF" : "ON"} (clicked)` });
    await pg.context().close();
  }
  await grid("toggles", cells, 440, 2);
}

// 6. Each shape at defaults, slider extremes and crowded combinations, desktop and phone.
const SETS = {
  rings: {
    keys: ["shape-rings", "shape-symmetry", "shape-spacing"],
    label: v => `r${v[0]} s${v[1]} sp${v[2]} e${v[3]}`,
    crowded: [[12, 24, 100, 80], [12, 15, 100, 80], [12, 21, 100, 60], [12, 24, 150, 80], [8, 16, 50, 80], [12, 13, 100, 44], [12, 24, 50, 20], [6, 10, 100, 44]],
  },
  spiral: {
    keys: ["shape-seeds", "shape-divergence", "shape-bands"],
    label: v => `n${v[0]} d${v[1]} b${v[2]} e${v[3]}`,
    crowded: [[300, 137.5, 5, 80], [300, 137, 3, 80], [300, 138, 1, 60], [220, 137.5, 4, 70], [40, 137.5, 5, 80], [300, 137.5, 3, 20], [144, 137.25, 3, 44], [144, 137.5, 3, 44]],
  },
};
if (want(6)) for (const [vpName, vp, opts] of [["desktop", DESKTOP, {}], ["phone", PHONE, PHONE_OPTS]]) {
  const pg = await open(vp, opts);
  for (const [shapeId, S] of Object.entries(SETS)) {
    await pickShape(pg, shapeId, false);
    const cells = [];
    const defaults = await Promise.all(S.keys.map(async id => Number(await pg.inputValue("#" + id))));
    cells.push({ file: await shot(pg, `${vpName}-${shapeId}-defaults`), label: "defaults " + S.label([...defaults, 44]) });
    for (const a of ["Home", "End"]) for (const bk of ["Home", "End"]) for (const c of ["Home", "End"]) for (const e of ["Home", "End"]) {
      for (const [id, key] of [[S.keys[0], a], [S.keys[1], bk], [S.keys[2], c], ["emojiSize", e]]) { await pg.locator("#" + id).click(); await pg.keyboard.press(key); }
      await pg.waitForTimeout(60);
      const v = await Promise.all([...S.keys, "emojiSize"].map(async id => Number(await pg.inputValue("#" + id))));
      cells.push({ file: await shot(pg, `${vpName}-${shapeId}-${S.label(v).replace(/ /g, "_")}`), label: S.label(v) });
    }
    await grid(`extremes-${shapeId}-${vpName}`, cells, 300, 4);
    const crowded = [];
    for (const v of S.crowded) {
      for (let i = 0; i < 3; i++) await setSlider(pg, S.keys[i], v[i]);
      await setSlider(pg, "emojiSize", v[3]);
      crowded.push({ file: await shot(pg, `${vpName}-${shapeId}-crowded-${S.label(v).replace(/ /g, "_")}`), label: S.label(v) });
    }
    await grid(`crowded-${shapeId}-${vpName}`, crowded, 300, 4);
    await setSlider(pg, "emojiSize", 44);
  }
  await pg.screenshot({ path: path.join(out, `page-${vpName}.png`), fullPage: true });
  check(pg.errs.length === 0, `${vpName}: no console errors (${pg.errs.join(" | ")})`);
}

await b.close(); srv.close();
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it; it must fail**

Run: `cd ~/.tools/playwright && ONLY=2 node slice3.mjs <worktree> <scratch>/s3`
Expected (about 30 s): 
```
FAIL desktop: strip has a button per shape ([])
FAIL desktop: rings tile pressed at load
FAIL desktop: thumbnails drawn and different
FAIL desktop: rings sliders generated
```
then the script exits with `locator.evaluate: Timeout 30000ms exceeded ... waiting for locator('#shape-rings')`. Check `ps` for leftover Chromium.

- [ ] **Step 3: Markup and styles**

`index.html`: replace the Rings field

```html
      <div class="field">
        <label>Rings <span class="val" id="ringsVal">6</span></label>
        <input type="range" id="rings" min="1" max="12" value="6">
      </div>

      <div class="field">
        <label>Symmetry (spokes) <span class="val" id="symVal">10</span></label>
        <input type="range" id="symmetry" min="3" max="24" value="10">
      </div>
```

with

```html
      <div class="field">
        <label class="group-label" id="shapeLabel">Shape</label>
        <div class="shape-strip" id="shapeStrip" role="group" aria-labelledby="shapeLabel"></div>
      </div>

      <div class="shape-controls" id="shapeControls"></div>
```

delete the Ring spacing field

```html
      <div class="field">
        <label>Ring spacing <span class="val" id="spaceVal">1.0×</span></label>
        <input type="range" id="spacing" min="50" max="150" value="100">
      </div>

```

and change the Alternate row's first two lines to

```html
      <div class="toggle-row" id="alternateRow">
        <label for="alternate" id="alternateLabel">Stagger alternate rings</label>
```

`styles.css`: append

```css
.shape-strip{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.shape-tile{
  width:72px;
  height:72px;
  padding:0;
  border-radius:50%;
  border:2px solid var(--line);
  background:var(--paper-2);
  overflow:hidden;
  cursor:pointer;
}
.shape-tile canvas{ width:100%; height:100%; display:block; }
.shape-tile[aria-pressed="true"]{ border-color:var(--coral); }
.shape-tile:focus-visible{ outline:2px solid var(--coral); outline-offset:2px; }
.shape-controls{
  display:flex;
  flex-direction:column;
  gap:22px;
}
```

- [ ] **Step 4: `js/shapeControls.js`**

Create:

```js
import { state } from "./state.js";
import { SHAPES, getShape, defaultParams } from "./shapes/index.js";
import { canvas, renderTo } from "./draw.js";

// The current shape's params, filled from its defaults on first visit.
// Each shape keeps its own values for the session (spec §1 "Switching shapes").
export function currentParams(){
  return state.shapeParams[state.shape] ??= defaultParams(getShape(state.shape));
}

// Sliders for the current shape's controls, generated from `shape.controls`,
// plus the Alternate switch's label and visibility.
export function renderShapeControls(onChange){
  const shape = getShape(state.shape), params = currentParams();
  const wrap = document.getElementById("shapeControls");
  wrap.innerHTML = "";
  for (const c of shape.controls){
    const format = c.format ?? String;
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.htmlFor = `shape-${c.key}`;
    const val = document.createElement("span");
    val.className = "val";
    val.id = `shape-${c.key}-val`;
    val.textContent = format(params[c.key]);
    label.append(c.label + " ", val);
    const input = document.createElement("input");
    // min/max/step before value, or the browser snaps value to the old step.
    Object.assign(input, { type: "range", id: `shape-${c.key}`, min: c.min, max: c.max, step: c.step });
    input.value = params[c.key];
    input.addEventListener("input", () => {
      params[c.key] = Number(input.value);
      val.textContent = format(params[c.key]);
      onChange();
    });
    field.append(label, input);
    wrap.appendChild(field);
  }
  const row = document.getElementById("alternateRow");
  row.hidden = !shape.alternate;
  if (shape.alternate){
    document.getElementById("alternateLabel").textContent = shape.alternate.label;
    document.getElementById("alternate").checked = params.alternate;
  }
}

// Shape thumbnail strip (spec §4): one button per shape with a live preview.
const THUMB_PX = 144; // backing pixels for a 72px tile, sharp on 2× screens

export function renderShapeStrip(onChange){
  const strip = document.getElementById("shapeStrip");
  strip.innerHTML = "";
  for (const shape of SHAPES){
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "shape-tile";
    tile.dataset.shape = shape.id;
    tile.title = shape.label;
    tile.setAttribute("aria-label", shape.label);
    const c = document.createElement("canvas");
    c.width = c.height = THUMB_PX;
    tile.appendChild(c);
    tile.addEventListener("click", () => selectShape(shape.id, onChange));
    strip.appendChild(tile);
  }
  syncShapeStrip();
  drawShapeThumbs();
}

export function selectShape(id, onChange){
  state.shape = id;
  syncShapeStrip();
  renderShapeControls(onChange);
  onChange();
}

export function syncShapeStrip(){
  document.querySelectorAll("#shapeStrip .shape-tile").forEach(tile => {
    tile.setAttribute("aria-pressed", String(tile.dataset.shape === state.shape));
  });
}

// Previews use each shape's defaults with the current palette, background
// and glow, scaled from the main canvas (spec §3 "Thumbnails").
export function drawShapeThumbs(){
  document.querySelectorAll("#shapeStrip .shape-tile").forEach(tile => {
    const shape = getShape(tile.dataset.shape);
    const c = tile.querySelector("canvas"), k = c.width / canvas.width;
    renderTo(c.getContext("2d"), c.width, {
      shape, params: defaultParams(shape), palette: state.palette,
      background: state.background, glow: state.glow,
      emojiSize: 44 * k, rotation: 0, centerMode: "emoji", faceOutward: false, minFont: 14 * k,
    });
  });
}
```

- [ ] **Step 5: Wire it into `js/main.js`**

Replace `import { getShape } from "./shapes/index.js";` with

```js
import { SHAPES, getShape, randomParams } from "./shapes/index.js";
import {
  currentParams,
  renderShapeControls,
  renderShapeStrip,
  syncShapeStrip,
  drawShapeThumbs
} from "./shapeControls.js";
```

The `draw()` wrapper becomes

```js
// Redraw the canvas, show which palette emoji it used, refresh the previews.
function draw(){
  const { used } = drawCanvas();
  updatePaletteCue(used, getShape(state.shape).label);
  drawShapeThumbs();
}
```

Delete `const ringsParams = () => state.shapeParams.rings;`. Replace the five
`bindRange(...)` lines with

```js
bindRange("rotation", "rotVal", "rotation", v => v + "°");
bindRange("emojiSize", "sizeVal", "emojiSize", v => v + "px");

// Shape strip and the current shape's generated sliders.
renderShapeStrip(draw);
renderShapeControls(draw);
```

In the Alternate listener, `ringsParams().alternate = e.target.checked;`
becomes `currentParams().alternate = e.target.checked;`.

In the Shuffle listener, replace everything from `const p = ringsParams();`
through `document.getElementById("faceOutward").checked = state.faceOutward;`
with

```js
  // A random shape with random values for its own controls.
  const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
  state.shape = shape.id;
  state.shapeParams[shape.id] = randomParams(shape, Math.random);
  state.rotation = Math.floor(Math.random()*360);
  state.faceOutward = Math.random() > 0.6;

  syncShapeStrip();
  renderShapeControls(draw);
  document.getElementById("rotation").value = state.rotation;
  document.getElementById("rotVal").textContent = state.rotation + "°";
  document.getElementById("faceOutward").checked = state.faceOutward;
```

(the palette shuffle below it is unchanged).

Run: `grep -rn "ringsVal\|symVal\|spaceVal\|ringsParams" js index.html` → no output.

- [ ] **Step 6: Run the tests**

Run: `node --test` → all pass (61).
Run: `cd ~/.tools/playwright && node clicks.mjs <worktree>` → six `PASS` lines, exit 0.
Run: `cd ~/.tools/playwright && ONLY=1,2,4 node slice3.mjs <worktree> <scratch>/s3` → every line `PASS`, final `ALL PASS`.
Then run section 3 alone: `ONLY=3 node slice3.mjs <worktree> <scratch>/s3`. Expected: exactly these 4 FAIL lines, which Task 4 fixes:
```
FAIL chip has an accessible name
FAIL ArrowRight on a focused × does not move its chip
FAIL × labels tell duplicates apart (Remove ✨ / Remove ✨)
FAIL vertical swipe on a chip scrolls the page (scrollY 0 -> 0)
```
Check `ps` for leftover Chromium.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css js/main.js js/shapeControls.js
git commit -m "Shape strip with live thumbnails, generated per-shape sliders; Shuffle picks a shape"
```

---

### Task 4: Palette follow-ups — phone scroll, chip names, × keys

Slice 2 follow-ups folded into this slice (ROADMAP item 1): chips block
page scroll on phones (spec §1 "Phone chip drag": `touch-action: pan-y`);
chips have no accessible name; arrow keys on a focused × move its chip.
And from the small-followups handoff: now that duplicates are allowed, two
× buttons both read "Remove 🌸"; they must name their copy.

**Files:**
- Modify: `styles.css` (`.palette-chip`), `js/palette.js` (`renderPaletteChips`, `attachReorder`)

**Interfaces:**
- Consumes / produces: nothing new.

- [ ] **Step 1: Confirm the failing checks**

Run: `cd ~/.tools/playwright && ONLY=3 node slice3.mjs <worktree> <scratch>/s3`
Expected: the 4 FAIL lines listed at the end of Task 3 Step 6.

- [ ] **Step 2: Implement**

`styles.css`, in the `.palette-chip` rule: `touch-action:none;` becomes `touch-action:pan-y;`.

`js/palette.js`, in `renderPaletteChips`, replace

```js
    remove.setAttribute("aria-label", "Remove " + e);
```

with

```js
    // Duplicates are allowed, so tell copies apart: "Remove 🌸 (2 of 2)".
    const copies = state.palette.filter(x => x === e).length;
    const nth = state.palette.slice(0, i + 1).filter(x => x === e).length;
    remove.setAttribute("aria-label", copies > 1 ? `Remove ${e} (${nth} of ${copies})` : `Remove ${e}`);
```

and directly after `wrap.innerHTML = "";` add

```js
  wrap.setAttribute("role", "list");
```

In `attachReorder`, replace

```js
  chip.tabIndex = 0;
  chip.addEventListener("keydown", e => {
```

with

```js
  chip.tabIndex = 0;
  chip.setAttribute("role", "listitem");
  chip.setAttribute("aria-label", `${state.palette[i]}, position ${i + 1} of ${state.palette.length}, arrow keys to move`);
  chip.addEventListener("keydown", e => {
    if (e.target !== chip) return; // keys on the × button don't move the chip
```

- [ ] **Step 3: Run the tests**

Run: `node --test` → all pass.
Run: `cd ~/.tools/playwright && ONLY=3 node slice3.mjs <worktree> <scratch>/s3` → every line `PASS`, including
`vertical swipe on a chip scrolls the page (scrollY 0 -> 30x)`,
`× labels tell duplicates apart (Remove ✨ (1 of 2) / Remove ✨ (2 of 2))`,
`sideways-start touch drag moves last chip to front, across rows`,
`tap on × removes a chip`; final `ALL PASS`. Check `ps`.

- [ ] **Step 4: Commit**

```bash
git add styles.css js/palette.js
git commit -m "Palette chips: vertical swipes scroll on phones, accessible names (duplicates told apart), × keys don't move chips"
```

---

### Task 5: Browser check, screenshot review, merge (orchestrator)

This task is done by the orchestrating session, not a subagent: it must look
at every screenshot itself.

- [ ] **Step 1:** In the worktree, `node --test` → all pass (61). Run
`cd ~/.tools/playwright && node slice3.mjs <worktree> <scratch>/slice3`
(all sections, a few minutes; run it in the background) → `ALL PASS`, exit 0
(90 PASS lines). Paste the non-`wrote` output into the report to the user.
Check `ps` for leftovers.

- [ ] **Step 2: Judge by eye** (Read each PNG):
  - `crowded-rings-{desktop,phone}.png` (rings 12 × symmetry 24/15/21/13,
    spacing 0.5×/1.0×/1.5×, sizes 20–80): every ring complete and evenly
    spaced, no scatter of mismatched counts in the core; crowded settings
    show an open halo around the center emoji; no overlaps.
  - `crowded-spiral-{desktop,phone}.png` (300 seeds at size 80, divergence
    137/137.25/138, bands 1–5): seeds evenly spread, no two touching, bands
    read as rings of colour, none touching the center emoji.
  - `extremes-rings-*.png`, `extremes-spiral-*.png` (defaults + 16 slider
    corners each): symmetric, no overlaps, nothing clipped at the edge.
  - `toggles.png`: Stagger, Face outward and Soft glow each differ at a
    glance (unchanged from slice 2).
  - `strip-{desktop,phone}.png`: two round tiles, the pressed one ringed in
    coral; each recognisable as its shape in the current palette.
  - `page-{desktop,phone}.png`: Shape field under Quick add/View zoom, the
    spiral's Seeds/Divergence/Bands below it, no Alternate row for spiral,
    palette wraps on phone, no horizontal scroll.
  If anything needs squinting or looks wrong, stop and ask the user.
- [ ] **Step 3:** Request a whole-branch review (superpowers:requesting-code-review, Opus reviewer) against this plan and the spec; fix findings; re-run `node --test` and `slice3.mjs`.
- [ ] **Step 4:** Update the spec §4 "Shape strip" bullet: the Shape field
  sits after Quick add and View zoom, directly above the generated sliders
  (decided in the slice 3 plan review). Update `ROADMAP.md`: tick
  **Slice 3** (merged date, one line on what shipped and that it was checked
  by `slice3.mjs`); in **Slice 2 follow-ups**, mark the spec §5 fix, crowded
  cores, phone chip scroll and chip accessible names done. Update the browser-testing memory note:
  `slice3.mjs` (with `ONLY=`) supersedes `slice2.mjs`; the `setSlider`
  pitfalls (a click on the bounding box's very edge misses a range input;
  static sliders have no `step` attribute, so `Number(e.step)` is 0).
- [ ] **Step 5:** superpowers:finishing-a-development-branch → merge `shapes-slice-3` into `main`.
