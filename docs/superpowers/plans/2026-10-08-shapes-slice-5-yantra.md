# Mandala Shapes — Slice 5 (Yantra) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fourth shape, **Yantra**: a bindu, one to three nested
hexagrams drawn as full triangle lines, one ring of lotus petals, and a
square frame (bhupura) with four classic T gates. It has Triangles / Petals
sliders and an "Offset petals" switch, appears as a fourth tile in the shape
strip and in Shuffle, never overlaps beyond its allowed 15 %, and stays
symmetric when crowded.

**Base:** `main` at or after the commit that adds this plan (it also carries
the slice 5 spec update).

**Architecture:** `js/shapes/yantra.js` is a pure layout like the other
shapes. `js/shapes/lib.js` gains `polygonPoints` (the square and the
triangles) and takes over the lotus's petal builders as `petalOutline` /
`petalSpoke`, so the yantra's lotus ring reuses them; `lotus.js` imports them
and behaves exactly as before. Registering the shape in `js/shapes/index.js`
is all the UI needs (slice 3's strip, generated sliders, Alternate row and
Shuffle read the registry). No HTML, CSS or `main.js` change.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and
`node:assert/strict`, run with `node --test` (Node 24). Browser checks use
Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`
(§1 decisions incl. **"Crowded groups"**, **"Lotus"** and **"Yantra"**,
decided 2026-10-08 from screenshot grids; §3 Shape interface, Files,
Fitting; §4 Shape strip; §5 **Yantra** (rewritten for this slice); §6 item
5; §7). Read it before starting any task.

**Provenance:** every code block in this plan was run in a scratch copy of
the repo before the plan was written: `node --test` passed (81 tests) and
`slice5.mjs` printed `ALL PASS` for every section, and the orchestrator
looked at every screenshot. The "expected failure" outputs below were
observed too, by applying the tasks one at a time to a fresh copy of
`main`. If something here fails for you, suspect a transcription slip
first, and report it rather than redesigning.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM.
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- At most **6** distinct emoji per shape, first N in palette order (`maxEmoji` 6 for the yantra).
- Fit floor: `floor = max(MIN_SCALE, minFont/emojiSize)`, `MIN_SCALE = 0.55`; the bindu (center emoji) scale is always 1.05.
- Yantra `overlap` is **0.15**: every pair of placements may be as close as `emojiSize·(a+b)/2·(1-0.15)`, measured by the same all-pairs sweep as the other shapes. Nothing is special-cased.
- Yantra lines (square, gates, petals, triangles) use the line scale `max(floor, 0.65)`; inner stars use `floor`.
- **Crowded groups** (spec §1): remove elements, keep the structure. A unit (a point and all its symmetric copies) is kept or dropped everywhere at once; a star whose six vertices don't fit is dropped with every star inside it; the square, the gates, the outer star and the lotus tips always fit.
- Copy: shape label **"Yantra"**; control labels **"Triangles"**, **"Petals"**; Alternate label **"Offset petals"** (default off). There is no Edge detail control (spec §1 "Yantra").
- Generated slider ids are `shape-triangles`, `shape-petals` (spec §4 `shape-<key>`). Petals steps by 4 (8, 12, 16).
- The lotus must not change: moving `outline`/`spoke` into `lib.js` is a rename only.
- Duplicates are allowed in the palette (they act as weights); never de-duplicate it.
- Every UI check uses **real Playwright locator clicks, taps, mouse drags, key presses or CDP touches on the visible element**. Never set `.checked`/`.value` or call `el.click()` from `page.evaluate`.
- Worktree agents must first check that `js/shapes/lotus.js`, `js/shapes/lib.js`, `js/shapeControls.js`, `tests/lotus.test.mjs` and `tests/registry.test.mjs` exist and that `git log --oneline -3` shows the slice 5 plan commit. If not, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`. macOS has no `timeout` command.
- After any Playwright run, check `ps aux | grep -E "[h]eadless|[s]lice5"` **in a separate command** (a command whose own text says "slice5" matches itself) and kill leftovers.
- `~/.tools/playwright/slice5.mjs` (outside the repo) was written and run while planning; **do not edit it**. It supersedes `slice4.mjs` (four shapes; `slice4.mjs` is left as it was). Sections: 1 every control, 2 strip + generated sliders for every shape, 3 palette, 4 Shuffle, 5 toggles, 6 screenshots per shape, 7 thumbnail cost. `ONLY=1,2` runs just those; a full run takes several minutes.

## Review Focus

Failure modes the per-task unit tests could miss, each with its owning check:

1. **The lotus must not change** when its petal builders move to `lib.js`. A slip in the move (a changed constant, a reordered unit) would shift every Lotus mandala. → Task 1: `lotus.test.mjs` (its symmetry, crowding and 648-combination sweep) stays green, `lotus.js` must be byte-identical to the plan's block, and the reviewer checks that the `petalOutline`/`petalSpoke` bodies match the removed `outline`/`spoke` bodies line for line (`git diff main -- js/shapes/lotus.js js/shapes/lib.js`). Task 4 Step 2: `extremes-lotus-*`/`crowded-lotus-*` look as in slice 4.
2. **The Alternate switch is per shape, and the yantra's defaults to off.** Turning Offset on must not turn off the lotus's Interleave or the rings' Stagger, and each shape must come back with its own switch state. → Task 3, `slice5.mjs` section 2 (`yantra Alternate pill click flips it and redraws`, `rings Alternate still on`, `yantra remembers its Alternate switch`, `yantra canvas is as it was`).
3. **A two-slider shape in UI built for three.** The strip, the generated sliders, the value labels and Shuffle must all cope with the yantra's two controls, and the Petals slider must land on 8, 12 or 16. → Task 3, sections 2 and 4 (`yantra sliders generated`, `slider shape-petals: click moves it (8 -> 16)`, 30 Shuffle clicks with labels matching values); `registry.test.mjs` `randomParams ... on the step grid` already loops over every shape.
4. **Crowding must keep every part symmetric and the frame whole** at every slider value and emoji size, not just at the tested points. → Task 2, `yantra.test.mjs` sweep (216 combinations, every pair of placements, square/gates/lotus/outer star present, consecutive groups on different slots).
5. **Four thumbnails redraw on every draw**, and the yantra's layout is the heaviest yet (about 1.5 ms per thumbnail). → Task 3, section 7 (`four thumbnails redraw in ... ms (< 8 ms)`).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/shapes/lib.js` | modify | add `petalOutline`, `petalSpoke` (moved from `lotus.js`) and `polygonPoints` |
| `js/shapes/lotus.js` | modify | import the petal builders from `lib.js` (no behaviour change) |
| `tests/fit.test.mjs` | modify | tests for the three `lib.js` additions |
| `js/shapes/yantra.js` | create | Yantra layout (pure) |
| `tests/yantra.test.mjs` | create | yantra layout, symmetry, nesting, crowding, sweep |
| `js/shapes/index.js` | modify | register the yantra after the lotus |
| `tests/registry.test.mjs` | modify | four shapes; yantra defaults |
| `ROADMAP.md`, memory note | modify (Task 4) | tick slice 5, record carry-overs |

**Models (keep usage low):** implementers — Tasks 1, 2 and 3 Haiku (the code
is given verbatim). Task reviewers — **Sonnet after Task 2** (the geometry is
the heart of the slice), Haiku after Tasks 1 and 3. Escalate a Haiku task to
Sonnet only if it fails twice. The whole-branch review before merge is the
one Opus call. Task 4's screenshot judgement is the orchestrator's, not a
subagent's.

**Orchestrator checklist (what worked in slices 3–4):** give each implementer
a task-brief file (its task copied from this plan) plus a shared-rules file
(Global Constraints), and each reviewer a review-package diff file
(`git diff <base>..HEAD > review-taskN.diff`). Before each review, `diff -q`
every file the task created or replaced against the prototype copy at
`.claude/worktrees/slice5-proto/` (byte-identical means no transcription
slip). Start the full `slice5.mjs` run in the background while the last task
review runs.

---

### Task 0: Worktree

- [ ] **Step 1:** Use superpowers:using-git-worktrees. Create branch `shapes-slice-5` from `main` (which includes this plan and the spec update). Run the Global Constraints file check. Leave `.claude/worktrees/small-followups` alone (it belongs to another session).
- [ ] **Step 2:** Run `node --test`. Expected: all pass (70 tests).

---

### Task 1: `lib.js` gains `polygonPoints`; the lotus's petal builders move there

Spec §3 Files, §5 Yantra steps 1–4, §6 item 5. `outline` and `spoke` move
from `lotus.js` to `lib.js` unchanged, renamed `petalOutline` and
`petalSpoke`; `lotus.js` imports them. `polygonPoints` returns evenly spaced
points along the sides of a regular polygon.

**Files:**
- Modify: `js/shapes/lib.js` (append), `js/shapes/lotus.js` (replace whole file), `tests/fit.test.mjs` (import line + append)

**Interfaces:**
- Consumes: `polar`, `petalCurve` (already in `lib.js`).
- Produces (in `lib.js`):
  - `petalOutline(B, T, phiMax, step) → units`, `petalSpoke(B, T, step) → units`: arrays of units, each unit an array of `{ r, phi }`; the tip unit `[{ r: T, phi: 0 }]` first. Same code as the lotus's old `outline`/`spoke`.
  - `polygonPoints(n, R, start, perSide) → [{ x, y, side, i }]`: side-major; side `k` runs from vertex `k` (at angle `start + 2πk/n`, radius `R`) to vertex `k+1`; `i = 0` is the vertex, `i = 1..perSide-1` evenly along the side.

- [ ] **Step 1: Write the failing tests**

In `tests/fit.test.mjs`, change the import line to

```js
import { MIN_SCALE, fitFloor, chord, fitRing, fitGap, polygonPoints, petalOutline, petalSpoke } from "../js/shapes/lib.js";
```

and append to the end of the file:

```js
test("polygonPoints: vertices on R, sides evenly split, side-major order", () => {
  const sq = polygonPoints(4, 100 * Math.SQRT2, -3 * Math.PI / 4, 4);
  assert.equal(sq.length, 16);
  assert.ok(near(sq[0].x, -100) && near(sq[0].y, -100));
  assert.deepEqual(sq.slice(0, 4).map(p => [Math.round(p.x), Math.round(p.y), p.side, p.i]),
    [[-100, -100, 0, 0], [-50, -100, 0, 1], [0, -100, 0, 2], [50, -100, 0, 3]]);
  assert.ok(near(sq[4].x, 100) && near(sq[4].y, -100) && sq[4].side === 1 && sq[4].i === 0);
  const tri = polygonPoints(3, 10, -Math.PI / 2, 1);
  tri.forEach(p => assert.ok(near(Math.hypot(p.x, p.y), 10)));
});

test("petalOutline and petalSpoke: tip first, then pairs or axis points toward the base", () => {
  const o = petalOutline(100, 400, 0.3, 44);
  assert.deepEqual(o[0], [{ r: 400, phi: 0 }]);
  assert.ok(o.slice(1).every(u => u.length === 2 && near(u[0].r, u[1].r) && near(u[0].phi, -u[1].phi)));
  const s = petalSpoke(100, 400, 100);
  assert.deepEqual(s.map(u => u[0].r), [400, 300, 200, 100]);
});
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `tests/fit.test.mjs` fails to load, everything else passes:
```
SyntaxError: The requested module '../js/shapes/lib.js' does not provide an export named 'petalOutline'
✖ tests/fit.test.mjs
ℹ tests 62
ℹ pass 61
ℹ fail 1
```

- [ ] **Step 3: Implement**

Append to `js/shapes/lib.js`:

```js
// One petal on axis angle 0, as units of points { r, phi }: the tip first,
// then each pair of side points from the tip down to the base, `step` apart
// along the petalCurve outline. A unit is kept or dropped whole, so petals
// stay mirror-symmetric.
export function petalOutline(B, T, phiMax, step){
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
export function petalSpoke(B, T, step){
  const units = [[{ r: T, phi: 0 }]];
  for (let r = T - step; r >= B - 1e-9; r -= step) units.push([{ r, phi: 0 }]);
  return units;
}

// Points along the sides of a regular n-gon with circumradius R whose first
// vertex is at angle `start`: side k runs from vertex k to vertex k+1 and holds
// `perSide` points, i = 0 (the vertex) .. perSide-1, evenly spaced.
export function polygonPoints(n, R, start, perSide){
  const out = [];
  for (let side = 0; side < n; side++){
    const a = polar(R, start + 2 * Math.PI * side / n), b = polar(R, start + 2 * Math.PI * (side + 1) / n);
    for (let i = 0; i < perSide; i++){
      const f = i / perSide;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, side, i });
    }
  }
  return out;
}
```

Replace the whole of `js/shapes/lotus.js` with (the only changes: the import
line, the two helper functions removed, and the call site renamed):

```js
import { polar, fitFloor, fitRing, petalOutline, petalSpoke } from "./lib.js";

const CENTER_SCALE = 1.05;
const OVERLAP = 0.15;

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
      const units = 2 * rw * Math.sin(phiMax) < need(s, s) ? petalSpoke(B, T, step) : petalOutline(B, T, phiMax, step);
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

Run: `node --test` → all pass (72 tests). `tests/lotus.test.mjs` passing
unchanged is the check that the lotus didn't move. The app is unchanged in
the browser.

- [ ] **Step 4b: Lotus equality check (the move must not change any layout)**

Snapshot main's shapes into a scratch dir, then compare every lotus
combination against the branch. Run from the worktree root:

```bash
S=$(mktemp -d) && git archive main js/shapes | tar -x -C "$S"
cat > "$S/lotuseq.mjs" <<EOF
import a from "$S/js/shapes/lotus.js";
import b from "$PWD/js/shapes/lotus.js";
let n = 0, diff = 0;
for (const layers of [1,2,3]) for (let petals = 4; petals <= 16; petals++) for (let width = 30; width <= 90; width += 5)
for (const alternate of [true,false]) for (const centerMode of ["emoji","empty"]) for (let emojiSize = 20; emojiSize <= 80; emojiSize += 6) {
  const p = { layers, petals, width, alternate, centerMode, radius: 500 - emojiSize*0.9, emojiSize, minFont: 14 }; n++;
  if (JSON.stringify(a.layout(p)) !== JSON.stringify(b.layout(p))) diff++;
}
console.log("lotus layouts identical in " + (n - diff) + " of " + n + " combinations");
EOF
node "$S/lotuseq.mjs"
```

Expected: `lotus layouts identical in 22308 of 22308 combinations`. Any
difference means the move changed the lotus; fix before committing.

- [ ] **Step 5: Commit**

```bash
git add js/shapes/lib.js js/shapes/lotus.js tests/fit.test.mjs
git commit -m "lib: polygonPoints, and the lotus's petal builders move here as petalOutline/petalSpoke"
```

---

### Task 2: The yantra layout

Spec §5 "Yantra". Placed in order: bindu; the square (corners on `radius`,
on a lattice of step `d`) and its four classic T gates on the same lattice;
the outer star (two full triangle lines and six knots); one lotus ring,
outlined or spokes, whichever keeps more emoji; inner stars turned 30° at
the floor scale. Every unit is kept only if it clears everything kept so far,
in all its symmetric copies at once.

**Files:**
- Create: `js/shapes/yantra.js`, `tests/yantra.test.mjs`

**Interfaces:**
- Consumes: `polar`, `fitFloor`, `polygonPoints`, `petalOutline`, `petalSpoke` from `lib.js` (Task 1).
- Produces: `yantra` (default export of `js/shapes/yantra.js`): `{ id: "yantra", label: "Yantra", controls: [triangles, petals], alternate: { label: "Offset petals", default: false }, maxEmoji: 6, overlap: 0.15, layout(params) }`. `layout` returns `{ placements, groups }` as spec §3. Groups, inside out: bindu (`solid`, slot 0, if shown); per star from the innermost: up triangle (`solid`, slot 1), down triangle (`solid`, slot 2), knots (`solid`, slot 0); lotus (`cycle`, size `petals`, slot 3); square (`solid`, slot 5); gates (`solid`, slot 4). A star with no knots kept has no knots group.

- [ ] **Step 1: Write the failing tests**

Create `tests/yantra.test.mjs`:

```js
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
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `tests/yantra.test.mjs` fails to load, everything else passes:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../js/shapes/yantra.js' imported from .../tests/yantra.test.mjs
✖ tests/yantra.test.mjs
ℹ tests 73
ℹ pass 72
ℹ fail 1
```

- [ ] **Step 3: Implement**

Create `js/shapes/yantra.js`:

```js
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
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass (81 tests). The yantra sweep checks every pair
of placements over 216 combinations in a few seconds. The app is unchanged
in the browser (the yantra is registered in Task 3).

- [ ] **Step 5: Commit**

```bash
git add js/shapes/yantra.js tests/yantra.test.mjs
git commit -m "Add the yantra shape: full-line hexagrams, a lotus ring, a square with T gates (polygonPoints)"
```

---

### Task 3: Register the yantra (strip tile, sliders, Shuffle)

Registering the shape is the whole UI change: slice 3's strip, generated
sliders, Alternate row and Shuffle read `SHAPES`.

**Files:**
- Modify: `js/shapes/index.js`, `tests/registry.test.mjs`

**Interfaces:**
- Consumes: `yantra` from Task 2.
- Produces: `SHAPES = [rings, spiral, lotus, yantra]`; `getShape("yantra") === yantra`; `defaultParams(yantra) → { triangles: 1, petals: 8, alternate: false }`.

- [ ] **Step 1: Write the failing tests**

In `tests/registry.test.mjs`:

1. After `import lotus from "../js/shapes/lotus.js";` add
   ```js
   import yantra from "../js/shapes/yantra.js";
   ```
2. In `registry order and lookup`, change the first assertion to
   ```js
     assert.deepEqual(SHAPES.map(s => s.id), ["rings", "spiral", "lotus", "yantra"]);
   ```
   and add, after `assert.equal(getShape("lotus"), lotus);`,
   ```js
     assert.equal(getShape("yantra"), yantra);
   ```
3. In `defaultParams: ...`, after the lotus line add
   ```js
     assert.deepEqual(defaultParams(yantra), { triangles: 1, petals: 8, alternate: false });
   ```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: 1 failure out of 81, `registry order and lookup`:
```
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
...
      'lotus',
  -   'yantra'
    actual: [ 'rings', 'spiral', 'lotus' ],
    expected: [ 'rings', 'spiral', 'lotus', 'yantra' ],
```

Run: `cd ~/.tools/playwright && ONLY=2 node slice5.mjs <worktree> <scratch>/s5`
Expected (about 40 s):
```
FAIL desktop: strip has a button per shape ([["rings","Concentric rings","BUTTON"],["spiral","Phyllotaxis spiral","BUTTON"],["lotus","Lotus","BUTTON"]])
FAIL desktop: thumbnails drawn and all different
```
then the script exits with `locator.click: Timeout 30000ms exceeded ... waiting for locator('#shapeStrip .shape-tile[data-shape="yantra"]')`. Check `ps` for leftover Chromium (separate command).

- [ ] **Step 3: Implement**

`js/shapes/index.js`: after `import lotus from "./lotus.js";` add

```js
import yantra from "./yantra.js";
```

and change `export const SHAPES = [rings, spiral, lotus];` to

```js
export const SHAPES = [rings, spiral, lotus, yantra];
```

- [ ] **Step 4: Run the tests**

Run: `node --test` → all pass (81).
Run: `cd ~/.tools/playwright && ONLY=1,2,4,7 node slice5.mjs <worktree> <scratch>/s5` → every line `PASS`, final `ALL PASS`, including
`desktop: yantra sliders generated`,
`phone: slider shape-petals: tap moves it (8 -> 16), label "16", redraws`,
`desktop: rings Alternate still on (lotus's switch didn't leak)`,
`Shuffle picked every shape in 30 clicks (lotus,yantra,spiral,rings)`,
`four thumbnails redraw in 2.54 ms (< 8 ms)`,
(the timing varies). Check `ps` for leftover Chromium (separate command).

- [ ] **Step 5: Commit**

```bash
git add js/shapes/index.js tests/registry.test.mjs
git commit -m "Register the yantra: fourth strip tile, its sliders, and Shuffle can pick it"
```

---

### Task 4: Browser check, screenshot review, merge (orchestrator)

This task is done by the orchestrating session, not a subagent: it must look
at every screenshot itself.

- [ ] **Step 1:** In the worktree, `node --test` → all pass (81). Run
`cd ~/.tools/playwright && node slice5.mjs <worktree> <scratch>/slice5`
(all sections, several minutes; start it in the background while the Task 3
review runs) → `ALL PASS`, exit 0. Paste the non-`wrote` output into the
report to the user. Check `ps` for leftovers (separate command).

- [ ] **Step 2: Judge by eye** (Read each PNG):
  - `crowded-yantra-{desktop,phone}.png` (Triangles 1–3, Petals 8–16, emoji
    size 20–80): square and four T gates always whole; both triangles read as
    lines; inner stars turned 30°, dropped (not squeezed) when there's no
    room; every petal the same; nothing overlapping beyond a light touch;
    nothing clipped at the edge. Known and accepted: at emoji size 80 the outer
    star has no room for line points (vertices and knots only), and the
    lotus keeps only short petals or tips, and Triangles 3 draws two stars.
    On desktop the four-tile strip wraps 3 + 1.
  - `extremes-yantra-*.png` (defaults + 8 slider corners): as above.
  - `crowded-*` / `extremes-*` for rings, spiral and lotus: unchanged from
    slice 4 (the lotus especially: Task 1 moved its petal code).
  - `toggles.png`, `toggles-lotus.png` unchanged; `toggles-yantra.png`:
    Offset petals turns the lotus half a petal (petals flank the gates instead
    of pointing at them); Face outward turns each line's emoji along its
    side's normal and each petal's along its axis.
  - `strip-{desktop,phone}.png`: four round tiles, the pressed one ringed in
    coral; the yantra tile reads as a square with a star.
  - `page-{desktop,phone}.png`: no horizontal scroll; strip wraps if needed.
  If anything needs squinting or looks wrong, stop and ask the user.
- [ ] **Step 3:** Request a whole-branch review (superpowers:requesting-code-review, **Opus** reviewer) against this plan and the spec; fix findings; re-run `node --test` and the affected `slice5.mjs` sections.
- [ ] **Step 4:** Update `ROADMAP.md`: tick **Slice 5** (merged date; one
  line on what shipped; checked by `slice5.mjs`), resolve its open questions
  (all decided, spec §1 "Yantra"), and carry the still-open minors (lotus
  sweep slack; Interleave picks layers by number; `bindRange`'s unused
  `target`; spiral `layout` reads `this.overlap`). Update the
  browser-testing memory note: `slice5.mjs` supersedes `slice4.mjs` (four
  shapes; section 6 handles shapes with two sliders), and `y5design.mjs`
  renders design grids from a cells JSON.
- [ ] **Step 5:** superpowers:finishing-a-development-branch → merge `shapes-slice-5` into `main`. Do not push (the user pushes).
