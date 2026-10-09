# Mandala Shapes — Slice 6 (Kolam) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fifth and last shape, **Kolam**: a square lattice of dot emoji, each inside a small diamond of line emoji, neighbouring diamonds touching at shared "knots". Grid / Spacing sliders and a "Checker colours" switch; a fifth strip tile; Shuffle can pick it; no overlaps beyond the allowed 15 %; symmetric when crowded.

**Base:** `main` at or after the commit that adds this plan (it also carries the slice 6 spec and ROADMAP update).

**Architecture:** `js/shapes/kolam.js` is a pure layout like the other shapes and needs nothing new in `lib.js` (its small symmetry helper lives in the file). Registering it in `js/shapes/index.js` is all the UI needs (the strip, generated sliders, Alternate row and Shuffle read the registry). No HTML, CSS or `main.js` change.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and `node:assert/strict`, run with `node --test` (Node 24). Browser checks use Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md` (§1 decisions incl. **"Crowded groups"** and **"Kolam"**, decided 2026-10-09 from prototype screenshots; §3 Shape interface, Fitting; §5 **Kolam** (rewritten for this slice); §6 item 6; §7). Read it before starting any task.

**Provenance:** every code block in this plan was run in a scratch copy of the repo before the plan was written: `node --test` passed (89 tests) and `slice6.mjs` printed `ALL PASS` (177 checks), and the orchestrator looked at the screenshots. The "expected failure" outputs below were observed too, by applying the tasks one at a time to a fresh copy of `main`. **If something here fails for you, suspect a transcription slip first, and report it rather than redesigning.** The tasks give whole files; do not "improve" them.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM.
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- At most **6** distinct emoji per shape, first N in palette order (`maxEmoji` 6).
- Fit floor: `floor = max(MIN_SCALE, minFont/emojiSize)`, `MIN_SCALE = 0.55`. Dots (all of them, the centre included) are scale 1.05; knots and side points use the line scale `max(floor, 0.65)`.
- Kolam `overlap` is **0.15**, checked by the same all-pairs sweep as the other shapes. Nothing is special-cased.
- **Crowded groups** (spec §1): remove elements, keep the structure. A unit (a point and all its copies under the square's 8 symmetries) is kept or dropped as a whole; the lattice loses rings of dots rather than showing a bare dot grid.
- Consecutive groups always have different slots. "Empty" centre removes the centre dot only.
- Copy: shape label **"Kolam"**; control labels **"Grid"**, **"Spacing"** (shown as `0.5×`–`1.0×`); Alternate label **"Checker colours"** (default off).
- Generated slider ids are `shape-grid`, `shape-spacing` (spec §4 `shape-<key>`). Grid steps by 2 (3, 5, 7, 9).
- Duplicates are allowed in the palette (they act as weights); never de-duplicate it.
- Every UI check uses **real Playwright locator clicks, taps, mouse drags, key presses or CDP touches on the visible element**. Never set `.checked`/`.value` or call `el.click()` from `page.evaluate`.
- Worktree agents must first check that `js/shapes/yantra.js`, `js/shapes/lib.js`, `js/shapeControls.js`, `tests/yantra.test.mjs` and `tests/registry.test.mjs` exist and that `git log --oneline -3` shows the slice 6 plan commit. If not, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`. macOS has no `timeout` command.
- After any Playwright run, check `ps aux | grep -E "[h]eadless|[s]lice6"` **in a separate command** (a command whose own text says "slice6" matches itself) and kill leftovers.
- `~/.tools/playwright/slice6.mjs` (outside the repo) was written and run while planning; **do not edit it**. It supersedes `slice5.mjs` (five shapes; `slice5.mjs` is left as it was). Sections: 1 every control, 2 strip + generated sliders for every shape, 3 palette, 4 Shuffle, 5 toggles, 6 screenshots per shape, 7 thumbnail cost. `ONLY=1,2` runs just those; a full run takes about 10 minutes.

## Review Focus

Failure modes the per-task unit tests could miss, each with its owning check:

1. **Symmetry when crowded.** A dropped unit must leave all four rotations and the mirror intact, and a diamond must never lose one side's point but not the others'. → Task 1: `the whole figure keeps its 4-fold rotation and mirror symmetry` (checks scale and slot of every copy at four emoji sizes, Checker on and off) and the sweep.
2. **The lattice must collapse to fewer dots, not to a bare dot grid or nothing.** Large emoji and low Spacing shrink Grid; every layout keeps knots and lines. → Task 1: `crowded: ...` (exact dot counts) and the sweep's "knots and lines slots always present".
3. **Checker colours is per shape and defaults to off.** Turning it on must not change the other shapes' switches, and each shape must come back with its own switch state. → Task 2, `slice6.mjs` section 2 (`kolam Alternate pill click flips it and redraws`, `rings Alternate still on`, `kolam remembers its Alternate switch`).
4. **Sliders that do nothing.** At the default emoji size Grid 9 shows the same as Grid 7 (a ring of dots is lost), which is known and accepted (spec §1 "Kolam"); the browser check clicks Grid at 60 % (→ 7) and Spacing at 80 % so each visibly redraws. → Task 2, section 2.
5. **Cost.** Five thumbnails redraw on every draw and the kolam is the heaviest layout (about 12 ms at emoji size 20, Grid 9, Spacing 1.0 on the main canvas; thumbnails are far lighter). → Task 2, section 7 (`five thumbnails redraw in ... ms (< 8 ms)`).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/shapes/kolam.js` | create | Kolam layout (pure) |
| `tests/kolam.test.mjs` | create | controls, groups, lattice, symmetry, Checker, empty centre, crowding, sweep |
| `js/shapes/index.js` | modify | register the kolam after the yantra |
| `tests/registry.test.mjs` | modify | five shapes; kolam defaults |
| `ROADMAP.md`, memory note | modify (Task 3) | tick slice 6, record carry-overs |

**Models (keep usage low, user's rule):** implementers — Tasks 1 and 2 **Sonnet** (code is given verbatim). Task reviewers — **Sonnet** (the geometry in Task 1 is the heart of the slice). Escalate only if a task fails twice. The whole-branch review before merge is **one Opus subagent** (`model: "opus"` override on the Agent call). Task 3's screenshot judgement is the orchestrator's, not a subagent's.

**Orchestrator recipe (what worked in slices 3–5):**
- For each implementer write two files into the scratchpad: a **task-brief file** (the task copied from this plan) and a **shared-rules file** (Global Constraints plus the rule "suspect a transcription slip first, report, don't redesign"). The implementer reads both.
- For each reviewer write a **review-package diff file** (`git diff <base>..HEAD > review-taskN.diff`) and give them the task text and the spec section.
- Before each review, **`diff -q`** every file the task created or replaced against the prototype at `.claude/worktrees/slice6-proto2/` (git-ignored; same relative paths). Byte-identical means a transcription slip is impossible.
- **Start the full `slice6.mjs` run in the background** while the Task 2 review runs.
- The orchestrator reads the screenshots itself; subagents once reported success on a blank canvas.

---

### Task 0: Worktree

- [ ] **Step 1:** Use superpowers:using-git-worktrees. Create branch `shapes-slice-6` from `main` (which includes this plan and the spec update). Run the Global Constraints file check. Leave `.claude/worktrees/small-followups` and the prototypes alone.
- [ ] **Step 2:** Run `node --test`. Expected: all pass (81 tests).

---

### Task 1: The kolam layout

Spec §1 "Kolam", §5 Kolam steps 1–5.

**Files:**
- Create: `tests/kolam.test.mjs`, `js/shapes/kolam.js`

**Interfaces:**
- Consumes: `fitFloor` from `js/shapes/lib.js` (exists).
- Produces: default export `{ id: "kolam", label: "Kolam", controls: [grid, spacing], alternate: { label: "Checker colours", default: false }, maxEmoji: 6, overlap: 0.15, layout(params) }`. `layout({ grid, spacing, alternate, centerMode, radius, emojiSize, minFont })` returns `{ placements, groups }`; every group is `{ size: 1, kind: "solid", slot }`, slots in order 0 (dots), 3 (second dots, Checker only), 2 (knots), 1 (lines), 4 (second lines, Checker only).

- [ ] **Step 1: Write the failing test.** Create `tests/kolam.test.mjs` with exactly:

```js
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
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test tests/kolam.test.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../js/shapes/kolam.js' imported from .../tests/kolam.test.mjs`, `ℹ tests 1`, `ℹ pass 0`.

- [ ] **Step 3: Implement.** Create `js/shapes/kolam.js` with exactly:

```js
import { fitFloor } from "./lib.js";

const DOT_SCALE = 1.05;
const OVERLAP = 0.15;
const LINE_SCALE = 0.65;  // lines are drawn finer than the emoji size (spec §1 "Kolam")

// The eight symmetries of the square, as maps on a position or a direction.
const SYM = [
  (x, y) => [x, y], (x, y) => [-y, x], (x, y) => [-x, -y], (x, y) => [y, -x],
  (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [y, x], (x, y) => [-y, -x],
];
const key = p => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;

// A point list (each { x, y, nx, ny }: position and outward direction) with all
// its symmetric copies, without repeats; heading null where there is no direction.
function orbit(pts){
  const out = new Map();
  for (const f of SYM) for (const p of pts){
    const [x, y] = f(p.x, p.y), [nx, ny] = f(p.nx, p.ny), q = { x, y, heading: nx || ny ? Math.atan2(ny, nx) : null };
    if (!out.has(key(q))) out.set(key(q), q);
  }
  return [...out.values()];
}

export default {
  id: "kolam",
  label: "Kolam",
  controls: [
    { key: "grid",    label: "Grid",    min: 3,  max: 9,   step: 2, default: 5, shuffle: [3, 7] },
    { key: "spacing", label: "Spacing", min: 50, max: 100, step: 1, default: 100, shuffle: [70, 100],
      format: v => (v / 100).toFixed(1) + "×" },
  ],
  alternate: { label: "Checker colours", default: false },
  maxEmoji: 6,
  overlap: OVERLAP,
  layout({ grid, spacing, alternate, centerMode, radius, emojiSize, minFont }){
    const floor = fitFloor(emojiSize, minFont), ls = Math.max(floor, LINE_SCALE);
    const need = (a, b) => emojiSize * (a + b) / 2 * (1 - OVERLAP);
    // Every point kept so far. A unit (a point and all its symmetric copies) is
    // kept only if each point clears everything kept and the rest of the unit,
    // so the figure stays symmetric (spec §1 "Crowded groups").
    const kept = [], done = new Set();
    const apart = (p, o, min) => (p.x - o.x) ** 2 + (p.y - o.y) ** 2 >= (min - 1e-9) ** 2;
    const tryUnit = (pts, scale, role) => {
      const unit = orbit(pts);
      if (done.has(key(unit[0]))) return;
      unit.forEach(p => done.add(key(p)));
      const ok = unit.every((p, i) =>
        kept.every(o => apart(p, o, need(scale, o.scale))) &&
        unit.every((q, j) => j === i || apart(p, q, need(scale, scale))));
      if (ok) for (const p of unit) kept.push({ ...p, scale, role });
    };

    // Dots on a g × g lattice of step s, the corners of its outermost diamonds
    // on `radius` (times Spacing). A diamond is `m` steps a side (its points
    // are L/m apart, L = s/√2); the lattice loses a ring of dots at a time until
    // the point next to a knot clears the dot inside the diamond, so the
    // diamonds always show (never a bare dot grid).
    const reach = k => radius / Math.hypot(k + 0.5, k) * spacing / 100;
    const steps = s => Math.max(1, Math.floor(s / Math.SQRT2 / need(ls, ls) + 1e-9));
    const roomy = s => { const m = steps(s), f = 1 / m; return m >= 2 && s / 2 * Math.hypot(1 - f, f) >= need(DOT_SCALE, ls) - 1e-9; };
    let g = grid, km = (g - 1) / 2, s = reach(km);
    while (g > 1 && !roomy(s)){ g -= 2; km = (g - 1) / 2; s = reach(km); }

    const cells = [];
    for (let i = 0; i <= km; i++) for (let j = 0; j <= i; j++) cells.push([i, j]);
    cells.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || b[0] - a[0]);
    const odd = (i, j) => (alternate && (i + j) % 2 ? 1 : 0);

    // Dots, then the knots where neighbouring diamonds touch (edge midpoints
    // between dots), then points along the diamond sides, those nearest a knot
    // first: crowding thins the middle of a side before its ends.
    for (const [i, j] of cells){
      if (i === 0 && centerMode === "empty") continue;
      tryUnit([{ x: i * s, y: j * s, nx: i, ny: j }], DOT_SCALE, "dots" + odd(i, j));
    }
    const knots = [];
    for (let a = 0; a <= km; a++) for (let b = 0; b <= km; b++) knots.push([a + 0.5, b]);
    knots.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
    for (const [a, b] of knots) tryUnit([{ x: a * s, y: b * s, nx: a, ny: b }], ls, "knots");

    const m = steps(s);
    for (let t = 1; t <= m / 2; t++) for (const [i, j] of cells){
      const c = { x: i * s, y: j * s }, V = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([a, b]) => ({ x: c.x + a * s / 2, y: c.y + b * s / 2 }));
      const pts = [];
      for (let q = 0; q < 4; q++){
        const A = V[q], B = V[(q + 1) % 4], nx = (A.x + B.x) / 2 - c.x, ny = (A.y + B.y) / 2 - c.y;
        for (const f of new Set([t, m - t])) pts.push({ x: A.x + (B.x - A.x) * f / m, y: A.y + (B.y - A.y) * f / m, nx, ny });
      }
      tryUnit(pts, ls, "lines" + odd(i, j));
    }

    // Groups inside out, with fixed role slots: dots 0 (second dots 3), knots 2,
    // lines 1 (second lines 4). "Empty" removes the centre dot.
    const order = [["dots0", 0], ["dots1", 3], ["knots", 2], ["lines0", 1], ["lines1", 4]];
    const groups = [], placements = [];
    for (const [role, slot] of order){
      const pts = kept.filter(p => p.role === role);
      if (!pts.length) continue;
      const gi = groups.push({ size: 1, kind: "solid", slot }) - 1;
      for (const p of pts) placements.push({ x: p.x, y: p.y, heading: p.heading, scale: p.scale, group: gi, index: 0 });
    }
    return { placements, groups };
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/kolam.test.mjs` → 8 pass. Run `node --test` → all 89 pass (81 + 8; the registry test is unchanged until Task 2).

- [ ] **Step 5: Commit**

```bash
git add tests/kolam.test.mjs js/shapes/kolam.js
git commit -m "Add the kolam shape: dots inside touching diamonds, with shared knots"
```

---

### Task 2: Register the kolam (strip tile, sliders, Shuffle)

Registering the shape is the whole UI change.

**Files:**
- Modify: `js/shapes/index.js`, `tests/registry.test.mjs`

**Interfaces:**
- Consumes: `kolam` from Task 1.
- Produces: `SHAPES = [rings, spiral, lotus, yantra, kolam]`; `getShape("kolam") === kolam`; `defaultParams(kolam) → { grid: 5, spacing: 100, alternate: false }`.

- [ ] **Step 1: Write the failing tests.** In `tests/registry.test.mjs`:

1. After `import yantra from "../js/shapes/yantra.js";` add
   ```js
   import kolam from "../js/shapes/kolam.js";
   ```
2. In `registry order and lookup`, change the first assertion to
   ```js
     assert.deepEqual(SHAPES.map(s => s.id), ["rings", "spiral", "lotus", "yantra", "kolam"]);
   ```
   and after `assert.equal(getShape("yantra"), yantra);` add
   ```js
     assert.equal(getShape("kolam"), kolam);
   ```
3. In `defaultParams: ...`, after the yantra line add
   ```js
     assert.deepEqual(defaultParams(kolam), { grid: 5, spacing: 100, alternate: false });
   ```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: 1 failure out of 89, `registry order and lookup`:
```
    actual: [ 'rings', 'spiral', 'lotus', 'yantra' ],
    expected: [ 'rings', 'spiral', 'lotus', 'yantra', 'kolam' ],
```

Run: `cd ~/.tools/playwright && ONLY=2 node slice6.mjs <worktree> <scratch>/s6`
Expected (about 40 s):
```
FAIL desktop: strip has a button per shape ([["rings","Concentric rings","BUTTON"],["spiral","Phyllotaxis spiral","BUTTON"],["lotus","Lotus","BUTTON"],["yantra","Yantra","BUTTON"]])
FAIL desktop: thumbnails drawn and all different
```
then the script dies with `locator.click: Timeout 30000ms exceeded`. Check `ps` for leftover Chromium (separate command).

- [ ] **Step 3: Implement.** In `js/shapes/index.js`, after `import yantra from "./yantra.js";` add

```js
import kolam from "./kolam.js";
```

and change `export const SHAPES = [rings, spiral, lotus, yantra];` to

```js
export const SHAPES = [rings, spiral, lotus, yantra, kolam];
```

- [ ] **Step 4: Run the tests**

Run: `node --test` → all pass (89).
Run: `cd ~/.tools/playwright && ONLY=1,2,4,7 node slice6.mjs <worktree> <scratch>/s6` → every line `PASS`, final `ALL PASS`, including `desktop: kolam sliders generated`, `desktop: slider shape-grid: click moves it (5 -> 7), ...`, `desktop: rings Alternate still on (lotus's switch didn't leak)`, `Shuffle picked every shape in 30 clicks (...)` and `five thumbnails redraw in ... ms (< 8 ms)` (about 4–5 ms; varies). Check `ps` for leftovers (separate command).

- [ ] **Step 5: Commit**

```bash
git add js/shapes/index.js tests/registry.test.mjs
git commit -m "Register the kolam: fifth strip tile, its sliders, and Shuffle can pick it"
```

---

### Task 3: Browser check, screenshot review, merge (orchestrator)

Done by the orchestrating session, not a subagent: it must look at every screenshot itself.

- [ ] **Step 1:** In the worktree, `node --test` → all pass (89). Run `cd ~/.tools/playwright && node slice6.mjs <worktree> <scratch>/slice6` (all sections, about 10 minutes; start it in the background while the Task 2 review runs) → `ALL PASS`, exit 0 (177 checks). Paste the non-`wrote` output into the report to the user. Check `ps` for leftovers (separate command).

- [ ] **Step 2: Judge by eye** (Read each PNG):
  - `crowded-kolam-{desktop,phone}.png` (Grid 3–9, Spacing 0.5–1.0, emoji size 20–80): every diamond is closed (corner and side emoji all round); dots in the middle of each; knots where diamonds touch; nothing overlapping beyond a light touch; nothing clipped. Known and accepted: at emoji size 80 Grid 5–9 show Grid 3; at the default size Grid 9 looks like Grid 7; Grid 3 with Spacing 0.5 and size 80 is one diamond.
  - `extremes-kolam-*.png`: as above; the figure is always square and symmetric.
  - `toggles-kolam.png`: Checker colours gives a chessboard of two dot colours and two line colours; Face outward turns knots, dots and side emoji away from the centre.
  - `crowded-*` / `extremes-*` for rings, spiral, lotus, yantra: unchanged from slice 5.
  - `strip-{desktop,phone}.png`: five round tiles, the pressed one ringed in coral; the kolam tile reads as a lattice. `page-{desktop,phone}.png`: no horizontal scroll.
  If anything needs squinting or looks wrong, stop and ask the user.
- [ ] **Step 3:** Whole-branch review: superpowers:requesting-code-review with an **Opus** reviewer (Agent tool, `model: "opus"`), against this plan and the spec; fix findings; re-run `node --test` and the affected `slice6.mjs` sections.
- [ ] **Step 4:** Update `ROADMAP.md`: tick **Slice 6** (merged date; one line on what shipped; checked by `slice6.mjs`, 177 checks), note the build order is finished, and carry the still-open minors (lotus sweep slack; Interleave picks layers by number; `bindRange`'s unused `target`; spiral `layout` reads `this.overlap`; yantra minors from slice 5). Update the browser-testing memory note: `slice6.mjs` supersedes `slice5.mjs` (five shapes), and `k6grid.mjs` renders kolam design grids from a cells JSON.
- [ ] **Step 5:** superpowers:finishing-a-development-branch → merge `shapes-slice-6` into `main`. **Do not push** (the user pushes).
