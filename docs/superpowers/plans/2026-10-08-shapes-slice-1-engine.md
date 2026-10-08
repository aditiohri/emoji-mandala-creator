# Mandala Shapes — Slice 1 (Engine, no visible change) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded ring loop in `js/draw.js` with the shape engine
(shape registry, pure `rings` layout, legacy emoji assigner, `renderTo`), with
**no visible change**: canvas pixels match a pre-refactor baseline.

**Architecture:** `rings.layout(params)` is a pure function that returns
placements and groups. `assignLegacy` reproduces today's colouring.
`renderTo(ctx, W, opts)` draws the background, then the placements, and
applies global rotation and Face outward. `draw()` becomes a thin wrapper that
reads `state`. `backgrounds.js` takes explicit options instead of `state`.
Shape settings move to `state.shapeParams.rings`.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and
`node:assert`, run with `node --test` (Node 24). Browser checks use Playwright
at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`
(§3 Architecture, §5 Concentric rings, §6 item 1, §7). Read it before
starting any task.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM.
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- `index.html` is **untouched** in this slice. The Backdrop value stays `"rings"`.
- `draw()` keeps its signature and callers. `draw.js` keeps exporting `canvas`, `ctx` and `initCanvas`.
- Pixels must match: fewer than **0.5%** of canvas pixels may differ by more than **8/255** in any channel, for every combination in Task 0.
- Rings keep today's overlaps. No fitting, no `assignEmoji`, no `layout.guides` drawing. Those come in slice 2.
- Worktree agents must first check that `js/palette.js`, `js/backgrounds.js` and `js/usage.js` exist. If they don't, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`.

## Review Focus

Things the spec implies but the per-task unit tests could easily miss. Each one has an owning test:

1. **Empty palette.** If `state.palette` is empty, the renderer must fall back to `DEFAULT_PALETTE` (center `✨`) and not draw `undefined`. → Task 3 equivalence sweep includes `palette: []`.
2. **Empty center.** With `centerMode: "empty"`, ring colouring must stay keyed by ring number, not by group position, so it doesn't shift by one. → Task 2 test `legacy colouring ignores group position` and Task 3 sweep.
3. **Face outward never rotates the center emoji** (`heading: null`). → Task 2 test `center heading is null` and Task 3 sweep with `faceOutward: true`.
4. **Sliders, Alternate and Shuffle still drive the canvas** after the state move. This includes the initial slider labels. → Task 4 Step 3 browser check (each control changes the canvas, labels match values, no console errors).
5. **Guide rings backdrop** stays at `(i/rings)·maxR`, not at ring radius, and follows the Rings slider. → Task 1 test `guide rings at i/guideRings of maxR`, plus combinations c5 and c7 (which uses spacing 150, where the two radii differ).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `~/.tools/playwright/pixeldiff.mjs` | create (outside repo) | capture/compare canvas pixels for fixed UI combinations |
| `js/backgrounds.js` | modify | `drawBackground(ctx, W, H, opts)` with explicit options; image luminance `WeakMap` cache |
| `js/shapes/lib.js` | create | `polar(r, angle)` |
| `js/shapes/rings.js` | create | Concentric rings shape (port of today's loop, no fitting) |
| `js/shapes/index.js` | create | `SHAPES`, `getShape(id)` |
| `js/pattern.js` | create | `assignLegacy(groups, palette)` |
| `js/draw.js` | modify | `renderTo(ctx, W, opts)`; `draw()` wraps it |
| `js/state.js` | modify | `state.shape`, `state.shapeParams.rings`; remove `rings/symmetry/spacing/alternate` |
| `js/main.js` | modify | slider bindings, Alternate listener, Shuffle write `state.shapeParams.rings` |
| `tests/backgrounds.test.mjs` | create | |
| `tests/shapes.test.mjs` | create | |
| `tests/pattern.test.mjs` | create | |
| `tests/render.test.mjs` | create | equivalence of `renderTo` with the pre-refactor `draw()` |
| `ROADMAP.md` | modify | tick slice 1 after merge |

Models: Task 0 and Task 4 are run by the orchestrating session. Tasks 1–3 are
implemented by Sonnet subagents.

---

### Task 0: Worktree and pre-refactor baseline

Run by the orchestrating session **before any code changes**.

**Files:**
- Create: `~/.tools/playwright/pixeldiff.mjs`
- Output: `~/.tools/playwright/baselines/shapes-slice1/*.png` (outside the repo, so every worktree can reach it)

- [ ] **Step 1: Create the worktree**

Use superpowers:using-git-worktrees. Create branch `shapes-slice-1` from `main`
(which includes this plan). Confirm `js/palette.js`, `js/backgrounds.js` and
`js/usage.js` exist in it.

- [ ] **Step 2: Write the pixel-diff script**

`~/.tools/playwright/pixeldiff.mjs`:

```js
// usage:
//   node pixeldiff.mjs capture <app-dir> <out-dir>
//   node pixeldiff.mjs compare <app-dir> <baseline-dir> <out-dir>
// Drives the real UI (works before and after the refactor), grabs the canvas
// bitmap via toDataURL (exact pixels, independent of page layout/DPR).
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";

const [mode, appArg, a3, a4] = process.argv.slice(2);
if (!["capture", "compare"].includes(mode)) { console.error("mode must be capture|compare"); process.exit(2); }
const dir = path.resolve(appArg);
const baseDir = mode === "compare" ? path.resolve(a3) : null;
const outDir = path.resolve(mode === "compare" ? a4 : a3);
fs.mkdirSync(outDir, { recursive: true });

const T = {".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/json"};
const srv = http.createServer((q, r) => {
  const p = path.join(dir, q.url === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream" }); r.end(d); });
}).listen(0);
const url = `http://localhost:${srv.address().port}/`;

// Each combination runs in a fresh context: empty localStorage, so the palette
// is DEFAULT_PALETTE (8 emoji) and the background is System.
// Steps: [elementId, value] | ["palette", keepCount] | ["bg", presetIndex]
const COMBOS = [
  { name: "c1-defaults-light", scheme: "light", steps: [] },
  { name: "c2-defaults-dark",  scheme: "dark",  steps: [] },
  { name: "c3-alt-off-outward-rot37", scheme: "light",
    steps: [["alternate", false], ["faceOutward", true], ["rotation", 37]] },
  { name: "c4-3emoji-r11-s7-sp60", scheme: "dark",
    steps: [["palette", 3], ["rings", 11], ["symmetry", 7], ["spacing", 60], ["faceOutward", true]] },
  { name: "c5-guides-empty-center", scheme: "dark",
    steps: [["backdrop", "rings"], ["centerMode", "empty"], ["rings", 3], ["symmetry", 21], ["rotation", 300]] },
  { name: "c6-gradient-big", scheme: "light",
    steps: [["bg", 9], ["backdrop", "none"], ["emojiSize", 80], ["spacing", 150], ["rings", 12], ["symmetry", 24]] },
  { name: "c7-small-guides-wide", scheme: "light",
    steps: [["emojiSize", 20], ["rings", 12], ["symmetry", 3], ["backdrop", "rings"], ["spacing", 150]] },
  { name: "c8-1emoji-black-s13", scheme: "light",
    steps: [["palette", 1], ["bg", 4], ["symmetry", 13], ["faceOutward", true], ["rotation", 180]] },
];

async function apply(pg, [key, v]) {
  if (key === "palette") {
    await pg.evaluate(n => {
      let b;
      while ((b = document.querySelectorAll(".palette-chip button")).length > n) b[b.length - 1].click();
    }, v);
  } else if (key === "bg") {
    await pg.evaluate(i => document.querySelector(`.bg-preset[data-idx="${i}"]`).click(), v);
  } else {
    await pg.evaluate(([id, v]) => {
      const e = document.getElementById(id);
      if (e.type === "checkbox") e.checked = v; else e.value = String(v);
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
    }, [key, v]);
  }
}

const browser = await chromium.launch();
const results = []; let failed = false;
for (const c of COMBOS) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: c.scheme });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on("pageerror", e => errs.push("pageerror: " + e.message));
  pg.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await pg.goto(url, { waitUntil: "load" });
  await pg.waitForTimeout(600);
  for (const s of c.steps) await apply(pg, s);
  await pg.waitForTimeout(200);
  const png = await pg.evaluate(() => document.getElementById("canvas").toDataURL("image/png"));
  fs.writeFileSync(path.join(outDir, c.name + ".png"), Buffer.from(png.split(",")[1], "base64"));
  const r = { name: c.name, errors: errs };
  if (mode === "compare") {
    const base = "data:image/png;base64," + fs.readFileSync(path.join(baseDir, c.name + ".png")).toString("base64");
    const d = await pg.evaluate(async (baseUrl) => {
      const c = document.getElementById("canvas"), W = c.width, H = c.height;
      const img = new Image(); img.src = baseUrl; await img.decode();
      if (img.width !== W || img.height !== H) return { sizeMismatch: [img.width, img.height, W, H] };
      const b = document.createElement("canvas"); b.width = W; b.height = H;
      const bx = b.getContext("2d"); bx.drawImage(img, 0, 0);
      const A = c.getContext("2d").getImageData(0, 0, W, H).data;
      const B = bx.getImageData(0, 0, W, H).data;
      const out = bx.createImageData(W, H); let bad = 0;
      for (let i = 0; i < A.length; i += 4) {
        const m = Math.max(Math.abs(A[i]-B[i]), Math.abs(A[i+1]-B[i+1]), Math.abs(A[i+2]-B[i+2]), Math.abs(A[i+3]-B[i+3]));
        if (m > 8) { bad++; out.data[i] = 255; out.data[i+1] = 0; out.data[i+2] = 0; out.data[i+3] = 255; }
        else { out.data[i] = B[i]; out.data[i+1] = B[i+1]; out.data[i+2] = B[i+2]; out.data[i+3] = 50; }
      }
      bx.putImageData(out, 0, 0);
      return { bad, total: W * H, diffPng: b.toDataURL("image/png") };
    }, base);
    if (d.sizeMismatch) { r.sizeMismatch = d.sizeMismatch; r.pass = false; }
    else {
      fs.writeFileSync(path.join(outDir, c.name + ".diff.png"), Buffer.from(d.diffPng.split(",")[1], "base64"));
      r.differing = d.bad; r.fraction = +(d.bad / d.total * 100).toFixed(4) + "%";
      r.pass = d.bad / d.total < 0.005;
    }
    if (!r.pass) failed = true;
  }
  if (errs.some(e => e.startsWith("pageerror"))) failed = true;
  results.push(r);
  await ctx.close();
}
console.log(JSON.stringify(results, null, 1));
await browser.close(); srv.close();
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Capture the baseline from the untouched worktree**

```bash
cd ~/.tools/playwright
node pixeldiff.mjs capture <worktree> baselines/shapes-slice1
```
Expected: 8 PNGs and exit 0. Record any `console:` errors here (the CDN
emoji-picker may log some offline). They count as pre-existing.

- [ ] **Step 4: Check the harness is deterministic**

```bash
node pixeldiff.mjs compare <worktree> baselines/shapes-slice1 <scratchpad>/slice1-selfcheck
```
Expected: every combination has `differing: 0`. If not, the harness is noisy.
Fix it (for example, wait longer before capturing) before continuing.

- [ ] **Step 5: Look at all 8 baseline PNGs yourself**

Use Read on each one. Check that each matches its name: c2 dark,
c3 rotated and facing outward, c4 has 3 emoji, c5 has guide circles and an
empty center, c6 has a coral→violet gradient and large emoji, c7 has small
emoji and guide circles, c8 has 1 emoji on black. If any is blank or wrong,
the step driver is broken; fix it before continuing.

---

### Task 1: `backgrounds.js` takes explicit options

**Files:**
- Modify: `js/backgrounds.js:36-150`
- Modify: `js/draw.js:17` (call site only; the old ring loop stays for now)
- Test: `tests/backgrounds.test.mjs`

**Interfaces:**
- Produces: `drawBackground(ctx, W, H, { background, backdrop, emojiSize, guideRings }) → dark: boolean`.
  `guideRings` is the number of guide circles drawn for backdrop `"rings"`, at radius `(i/guideRings)·maxR`, `i = 1..guideRings`.
- Produces: `getBackgroundLuminance(background) → number`. It now takes the **background object**, not `state`.
- Image luminance is cached in a module-level `WeakMap` keyed by `imageElement`.

- [ ] **Step 1: Write the failing tests** — `tests/backgrounds.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawBackground, getBackgroundLuminance } from "../js/backgrounds.js";

function mockCtx() {
  const calls = [];
  return {
    calls, fillStyle: "", strokeStyle: "", lineWidth: 1,
    fillRect() {}, beginPath() {}, fill() {}, stroke() {}, drawImage() {},
    arc(x, y, r) { calls.push({ op: "arc", x, y, r }); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
}

test("guide rings at i/guideRings of maxR, from explicit options", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, {
    background: { type: "solid", color: "#000000" },
    backdrop: "rings", emojiSize: 44, guideRings: 4,
  });
  const maxR = 500 - 44 * 0.9;
  assert.deepEqual(ctx.calls.map(c => c.r), [1, 2, 3, 4].map(i => (i / 4) * maxR));
  assert.ok(ctx.calls.every(c => c.x === 500 && c.y === 500));
});

test("returns dark for dark solid, light for light solid", () => {
  const opts = { backdrop: "none", emojiSize: 44, guideRings: 6 };
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#000000" } }), true);
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#ffffff" } }), false);
});

test("soft backdrop draws one glow circle of radius maxR*1.05", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, { background: { type: "solid", color: "#000000" }, backdrop: "soft", emojiSize: 20, guideRings: 6 });
  assert.deepEqual(ctx.calls.map(c => c.r), [(500 - 20 * 0.9) * 1.05]);
});

test("getBackgroundLuminance takes the background object", () => {
  assert.equal(getBackgroundLuminance({ type: "solid", color: "#000000" }), 0);
  assert.equal(getBackgroundLuminance(undefined), 0.5);
});

test("image luminance is computed once per image element", () => {
  let created = 0;
  globalThis.document = {
    createElement() {
      created++;
      return { getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }) }) };
    },
  };
  try {
    const img = { width: 10, height: 10 };
    const bg = { type: "image", imageElement: img };
    const a = getBackgroundLuminance(bg);
    const b = getBackgroundLuminance(bg);
    assert.equal(a, b);
    assert.equal(created, 1);
  } finally { delete globalThis.document; }
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `node --test`
Expected: the guide-ring test FAILS (no arcs, because it reads `state.rings`,
which is undefined). The cache test FAILS with `created === 2`.

- [ ] **Step 3: Implement**

In `js/backgrounds.js`:

```js
const imageLumCache = new WeakMap();

function getLuminanceForImage(img) {
  if (!img) return 0.5;
  if (imageLumCache.has(img)) return imageLumCache.get(img);
  // ... existing body unchanged, but store the result:
  const lum = totalLum / (data.length / 4);
  imageLumCache.set(img, lum);
  return lum;
}

// Get luminance for a background object ({ type, ... })
export function getBackgroundLuminance(bg) {
  if (!bg) return 0.5;
  // ... rest of the existing body unchanged (it already uses `bg`)
}

// Draw the canvas background. opts = { background, backdrop, emojiSize, guideRings }
export function drawBackground(ctx, W, H, opts) {
  const bg = opts.background;
  const cx = W/2, cy = H/2;
  const maxR = W/2 - opts.emojiSize*0.9;
  const lum = getBackgroundLuminance(bg);
  // ... unchanged, except: state.backdrop -> opts.backdrop,
  //     state.rings -> opts.guideRings (both lines of the guide loop)
}
```

Remove the line `const bg = state.background;` from `getBackgroundLuminance`.
No other logic changes.

In `js/draw.js:17`, replace `drawBackground(ctx, W, H, state)` with:

```js
  const dark = drawBackground(ctx, W, H, {
    background: state.background, backdrop: state.backdrop,
    emojiSize: state.emojiSize, guideRings: state.rings,
  });
```

- [ ] **Step 4: Run tests**

Run: `node --test`
Expected: all pass, including the existing `tests/usage.test.mjs`.

- [ ] **Step 5: Commit**

```bash
git add js/backgrounds.js js/draw.js tests/backgrounds.test.mjs
git commit -m "Backgrounds take explicit options; cache image luminance"
```

---

### Task 2: Shape registry, rings layout, legacy assigner

**Files:**
- Create: `js/shapes/lib.js`, `js/shapes/rings.js`, `js/shapes/index.js`, `js/pattern.js`
- Test: `tests/shapes.test.mjs`, `tests/pattern.test.mjs`

**Interfaces:**
- Produces: `polar(r, angle) → { x, y }` (`x = r·cos`, `y = r·sin`).
- Produces: `rings` shape object, the default export of `js/shapes/rings.js`:
  `{ id: "rings", label: "Concentric rings", controls: [...], alternate: { label: "Alternate ring direction", default: true }, maxEmoji: 6, overlap: 0, layout(params) }`.
  `controls` must be exactly as in spec §3 "Shape interface", including `shuffle` and `format`.
- Produces: `rings.layout({ rings, symmetry, spacing, alternate, centerMode, radius, emojiSize, minFont }) → { placements, groups, guides }`
  - placements: `{ x, y, heading, scale, group, index }`, in **draw order**: center first (if any), then ring 1 `s = 0..symmetry-1`, ring 2, ...
  - center (only when `centerMode === "emoji"`): `{ x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 }`. Group `{ size: 1, kind: "solid", slot: 0 }`.
  - ring `k` (1-based): `ringSpacing = (spacing/100)·(radius/rings)`, `r = k·ringSpacing`; `alt = alternate && k % 2 === 0`; `dir = alt ? -1 : 1`; `off = alt ? π/symmetry : 0`; for `s`: `angle = dir·(s/symmetry)·2π + off`; `{x, y} = polar(r, angle)`; `heading = angle`; `scale = 1 - (k-1)·0.03` (written **exactly** like this, so float results match today's `emojiSize * (1 - (ring-1)*0.03)`); `index = s`.
    Group `{ size: symmetry, kind: "cycle", reverse: alt, ring: k }`.
  - guides: `{ type: "circle", r }` per ring. These are not drawn in slice 1.
  - Use the same expression order as today's `draw.js:37-49` so the floats come out identical.
- Produces: `SHAPES` (array, `[rings]`), `getShape(id) → shape`. An unknown id returns `SHAPES[0]`.
- Produces: `assignLegacy(groups, palette) → { emojiFor(group, index) → string, used: Set<number> }`.
  `palette` is non-empty. Group without `ring` → `palette[0]`. Group with `ring` → `palette[((ring*31) % len + index) % len]`. `used` = the palette indices drawn for indices `0..size-1` of every group.

- [ ] **Step 1: Write the failing tests** — `tests/shapes.test.mjs`

```js
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
  assert.deepEqual(rings.alternate, { label: "Alternate ring direction", default: true });
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
```

`tests/pattern.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignLegacy } from "../js/pattern.js";

const P = ["a", "b", "c", "d", "e", "f", "g", "h"];

test("center gets palette[0]", () => {
  const { emojiFor } = assignLegacy([{ size: 1, kind: "solid", slot: 0 }], P);
  assert.equal(emojiFor(0, 0), "a");
});

test("ring colouring is today's formula", () => {
  const groups = [{ size: 1, kind: "solid", slot: 0 }, { size: 10, kind: "cycle", reverse: false, ring: 1 }, { size: 10, kind: "cycle", reverse: true, ring: 2 }];
  const { emojiFor } = assignLegacy(groups, P);
  for (const [g, ring] of [[1, 1], [2, 2]]) for (let s = 0; s < 10; s++)
    assert.equal(emojiFor(g, s), P[((ring * 31) % 8 + s) % 8]);
});

test("legacy colouring ignores group position", () => {
  const ring1 = { size: 5, kind: "cycle", reverse: false, ring: 1 };
  const withCenter = assignLegacy([{ size: 1, kind: "solid", slot: 0 }, ring1], P);
  const noCenter = assignLegacy([ring1], P);
  for (let s = 0; s < 5; s++) assert.equal(withCenter.emojiFor(1, s), noCenter.emojiFor(0, s));
});

test("used lists exactly the palette indices drawn", () => {
  // ring 1 offset = 31 % 8 = 7; size 3 -> indices 7, 0, 1
  const { used } = assignLegacy([{ size: 3, kind: "cycle", reverse: false, ring: 1 }], P);
  assert.deepEqual([...used].sort((a, b) => a - b), [0, 1, 7]);
});

test("single-emoji palette", () => {
  const { emojiFor, used } = assignLegacy([{ size: 1, kind: "solid", slot: 0 }, { size: 4, kind: "cycle", reverse: false, ring: 3 }], ["x"]);
  assert.equal(emojiFor(0, 0), "x"); assert.equal(emojiFor(1, 3), "x");
  assert.deepEqual([...used], [0]);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test`
Expected: FAIL with `Cannot find module '.../js/shapes/lib.js'` (and similar for `pattern.js`).

- [ ] **Step 3: Implement**

`js/shapes/lib.js`:

```js
// Shared geometry for shapes. Pure; no DOM, no state.
export function polar(r, angle){
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}
```

`js/shapes/rings.js`:

```js
import { polar } from "./lib.js";

// Concentric rings. Port of the original draw loop (no fitting yet).
export default {
  id: "rings",
  label: "Concentric rings",
  controls: [
    { key: "rings",    label: "Rings",             min: 1,  max: 12,  step: 1, default: 6,
      shuffle: [3, 11] },
    { key: "symmetry", label: "Symmetry (spokes)", min: 3,  max: 24,  step: 1, default: 10,
      shuffle: [4, 21] },
    { key: "spacing",  label: "Ring spacing",      min: 50, max: 150, step: 1, default: 100,
      shuffle: [60, 149], format: v => (v/100).toFixed(1) + "×" },
  ],
  alternate: { label: "Alternate ring direction", default: true },
  maxEmoji: 6,
  overlap: 0,
  layout({ rings, symmetry, spacing, alternate, centerMode, radius }){
    const placements = [], groups = [], guides = [];
    if (centerMode === "emoji"){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: 1.05, group: 0, index: 0 });
    }
    const ringSpacing = (spacing/100) * (radius / rings);
    for (let ring=1; ring<=rings; ring++){
      const r = ring * ringSpacing;
      const alt = alternate && ring % 2 === 0;
      const dir = alt ? -1 : 1;
      const offset = alt ? Math.PI/symmetry : 0;
      const scale = 1 - (ring-1)*0.03;
      const group = groups.length;
      groups.push({ size: symmetry, kind: "cycle", reverse: alt, ring });
      guides.push({ type: "circle", r });
      for (let s=0; s<symmetry; s++){
        const angle = dir * (s / symmetry) * Math.PI*2 + offset;
        const { x, y } = polar(r, angle);
        placements.push({ x, y, heading: angle, scale, group, index: s });
      }
    }
    return { placements, groups, guides };
  },
};
```

`js/shapes/index.js`:

```js
import rings from "./rings.js";

// Ordered list of shapes, as shown in the UI.
export const SHAPES = [rings];

export function getShape(id){
  return SHAPES.find(s => s.id === id) ?? SHAPES[0];
}
```

`js/pattern.js`:

```js
// Emoji assignment. Slice 1 has only the legacy mode, which reproduces the
// original colouring exactly; slice 2 replaces it with assignEmoji().
export function assignLegacy(groups, palette){
  const len = palette.length;
  const slotFor = (g, i) => {
    const ring = groups[g].ring;
    return ring === undefined ? 0 : ((ring*31) % len + i) % len;
  };
  const used = new Set();
  groups.forEach((g, gi) => { for (let i=0; i<g.size; i++) used.add(slotFor(gi, i)); });
  return { emojiFor: (g, i) => palette[slotFor(g, i)], used };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add js/shapes js/pattern.js tests/shapes.test.mjs tests/pattern.test.mjs
git commit -m "Add shape registry, rings layout and legacy emoji assigner"
```

---

### Task 3: `renderTo`, `draw()` wrapper, state move, `main.js` bindings

These three change together: once `state.rings` is gone, `draw.js` and `main.js`
have to read `state.shapeParams.rings` in the same commit.

**Files:**
- Modify: `js/draw.js` (whole file)
- Modify: `js/state.js:10-23`
- Modify: `js/main.js:73-145`
- Test: `tests/render.test.mjs`

**Interfaces:**
- Consumes: `getShape(id)`, `shape.layout(params)`, `assignLegacy(groups, palette)`, `drawBackground(ctx, W, H, { background, backdrop, emojiSize, guideRings })`.
- Produces: `renderTo(ctx, W, opts)`, with
  `opts = { shape, params, palette, background, backdrop, emojiSize, rotation, centerMode, faceOutward, minFont }`.
  `shape` is a shape object, `params` its control values plus `alternate`,
  `rotation` is in degrees, and `palette` may be empty (renderTo substitutes `DEFAULT_PALETTE`).
- Produces: `state.shape = "rings"`, `state.shapeParams = { rings: { rings: 6, symmetry: 10, spacing: 100, alternate: true } }`. The top-level `state.rings/symmetry/spacing/alternate` are removed.

- [ ] **Step 1: Write the failing test** — `tests/render.test.mjs`

This test holds a **verbatim copy of today's `draw()` loop** as the reference.
It renders both versions to a recording mock context and compares every
`fillText`: emoji, exact font string, position (to 1e-6) and rotation (to 1e-9).

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTo } from "../js/draw.js";
import { getShape } from "../js/shapes/index.js";
import { state, DEFAULT_PALETTE } from "../js/state.js";
import rings from "../js/shapes/rings.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

// Records the translate/rotate in effect at each fillText. Both renderers only
// ever translate, then rotate, inside save/restore.
function mockCtx(){
  const calls = []; let t = { x: 0, y: 0, r: 0 }; const stack = [];
  return {
    calls, font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "", textBaseline: "",
    save(){ stack.push({ ...t }); }, restore(){ t = stack.pop(); },
    translate(x, y){ if (t.r !== 0) throw new Error("translate after rotate"); t = { ...t, x: t.x + x, y: t.y + y }; },
    rotate(a){ t = { ...t, r: t.r + a }; },
    fillText(text, x, y){ calls.push({ text, font: this.font, fillStyle: this.fillStyle, x: t.x + x, y: t.y + y, r: t.r }); },
    clearRect(){}, fillRect(){}, beginPath(){}, fill(){}, stroke(){}, arc(){},
    createRadialGradient(){ return { addColorStop(){} }; },
    createLinearGradient(){ return { addColorStop(){} }; },
  };
}

// Verbatim port of js/draw.js draw() before slice 1 (background omitted).
function legacyDraw(ctx, W, s){
  const cx = W/2, cy = W/2;
  const maxR = W/2 - s.emojiSize*0.9;
  ctx.font = s.emojiSize + FONT;
  const palette = s.palette.length ? s.palette : DEFAULT_PALETTE;
  if (s.centerMode === "emoji"){
    ctx.save(); ctx.translate(cx, cy);
    ctx.font = (s.emojiSize*1.05) + FONT;
    ctx.fillText(palette[0], 0, 0); ctx.restore();
  }
  const ringSpacing = (s.spacing/100) * (maxR / s.rings);
  for (let ring=1; ring<=s.rings; ring++){
    const r = ring * ringSpacing;
    const dir = (s.alternate && ring % 2 === 0) ? -1 : 1;
    const ringPatternOffset = (ring * 31) % palette.length;
    const ringRotOffset = (s.rotation * Math.PI/180) + (s.alternate && ring % 2 === 0 ? Math.PI/s.symmetry : 0);
    const ringSize = s.emojiSize * (1 - (ring-1)*0.03);
    ctx.font = Math.max(14, ringSize) + FONT;
    for (let k=0; k<s.symmetry; k++){
      const angle = dir * (k / s.symmetry) * Math.PI*2 + ringRotOffset;
      ctx.save(); ctx.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      if (s.faceOutward) ctx.rotate(angle + Math.PI/2);
      ctx.fillText(palette[(ringPatternOffset + k) % palette.length], 0, 0);
      ctx.restore();
    }
  }
}

function render(s){
  const ctx = mockCtx();
  renderTo(ctx, 1000, {
    shape: rings, params: { rings: s.rings, symmetry: s.symmetry, spacing: s.spacing, alternate: s.alternate },
    palette: s.palette, background: { type: "solid", color: "#000000" }, backdrop: "none",
    emojiSize: s.emojiSize, rotation: s.rotation, centerMode: s.centerMode, faceOutward: s.faceOutward, minFont: 14,
  });
  return ctx.calls;
}

test("renderTo matches the pre-refactor draw() exactly", () => {
  const palettes = [[], ["x"], ["x", "y", "z"], [...DEFAULT_PALETTE]];
  for (const r of [1, 2, 5, 12]) for (const symmetry of [3, 10, 13, 24]) for (const spacing of [50, 150])
  for (const alternate of [true, false]) for (const faceOutward of [true, false]) for (const rotation of [0, 37])
  for (const emojiSize of [20, 80]) for (const centerMode of ["emoji", "empty"]) for (const palette of palettes) {
    const s = { rings: r, symmetry, spacing, alternate, faceOutward, rotation, emojiSize, centerMode, palette };
    const want = mockCtx(); legacyDraw(want, 1000, s);
    const got = render(s);
    const tag = JSON.stringify(s);
    assert.equal(got.length, want.calls.length, tag);
    got.forEach((g, i) => {
      const w = want.calls[i];
      assert.equal(g.text, w.text, tag);
      assert.equal(g.font, w.font, tag);
      assert.equal(g.fillStyle, "#f2ecdd", tag); // black background -> dark text colour
      assert.ok(Math.abs(g.x - w.x) < 1e-6 && Math.abs(g.y - w.y) < 1e-6, tag);
      assert.ok(Math.abs(g.r - w.r) < 1e-9, tag);
    });
  }
});

test("state holds rings params under shapeParams, matching control defaults", () => {
  assert.equal(state.shape, "rings");
  const defaults = Object.fromEntries(rings.controls.map(c => [c.key, c.default]));
  assert.deepEqual(state.shapeParams.rings, { ...defaults, alternate: rings.alternate.default });
  for (const k of ["rings", "symmetry", "spacing", "alternate"]) assert.ok(!(k in state), k);
  assert.equal(getShape(state.shape), rings);
});
```

- [ ] **Step 2: Run and confirm failure**

Run: `node --test`
Expected: FAIL. `renderTo` is not exported, and `state.shape` is undefined.

- [ ] **Step 3: Implement `js/draw.js`**

```js
import { state, DEFAULT_PALETTE } from "./state.js";
import { drawBackground } from "./backgrounds.js";
import { getShape } from "./shapes/index.js";
import { assignLegacy } from "./pattern.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

export let canvas = null;
export let ctx = null;

export function initCanvas(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

// Draw a mandala on any square canvas of side W.
// opts = { shape, params, palette, background, backdrop, emojiSize,
//          rotation (degrees), centerMode, faceOutward, minFont }
export function renderTo(ctx, W, opts){
  const { shape, params, emojiSize, minFont, faceOutward } = opts;
  ctx.clearRect(0, 0, W, W);
  const dark = drawBackground(ctx, W, W, {
    background: opts.background, backdrop: opts.backdrop, emojiSize,
    guideRings: params.rings, // slice 1 only: backdrop guide circles
  });

  const cx = W/2, cy = W/2;
  const radius = W/2 - emojiSize*0.9;
  const rot = opts.rotation * Math.PI/180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const palette = opts.palette.length ? opts.palette : DEFAULT_PALETTE;

  const { placements, groups } = shape.layout({ ...params, centerMode: opts.centerMode, radius, emojiSize, minFont });
  const { emojiFor } = assignLegacy(groups, palette);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#f2ecdd" : "#241c38";
  for (const p of placements){
    ctx.font = Math.max(minFont, emojiSize * p.scale) + FONT;
    ctx.save();
    ctx.translate(cx + p.x*cos - p.y*sin, cy + p.x*sin + p.y*cos);
    if (faceOutward && p.heading !== null) ctx.rotate(p.heading + rot + Math.PI/2);
    ctx.fillText(emojiFor(p.group, p.index), 0, 0);
    ctx.restore();
  }
}

export function draw(){
  renderTo(ctx, canvas.width, {
    shape: getShape(state.shape),
    params: state.shapeParams[state.shape],
    palette: state.palette,
    background: state.background,
    backdrop: state.backdrop,
    emojiSize: state.emojiSize,
    rotation: state.rotation,
    centerMode: state.centerMode,
    faceOutward: state.faceOutward,
    minFont: 14,
  });
}
```

Note on font: the center emoji's font becomes `max(14, emojiSize·1.05)`. Today
it is `emojiSize·1.05` with no floor. These match because the Emoji size slider's
minimum is 20 (20·1.05 = 21 > 14). The equivalence test checks this.

- [ ] **Step 4: Implement `js/state.js`**

Replace lines 10–23 with:

```js
export const state = {
  palette: [...DEFAULT_PALETTE],
  shape: "rings",
  // Per-shape control values (plus `alternate`). Other shapes are filled
  // lazily from their control defaults on first visit (slice 3).
  shapeParams: {
    rings: { rings: 6, symmetry: 10, spacing: 100, alternate: true },
  },
  rotation: 0,
  emojiSize: 44,
  centerMode: "emoji",
  faceOutward: false,
  backdrop: "soft",
  zoom: 100,
  background: { type: "system" }
};
```

- [ ] **Step 5: Implement `js/main.js`**

Replace `bindRange` (lines 73–83) so it can write into a nested object:

```js
// Setup sliders. `target` returns the object the value lives in.
function bindRange(id, labelId, key, fmt, target = () => state){
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);
  el.addEventListener("input", () => {
    target()[key] = Number(el.value);
    if (label) label.textContent = fmt(target()[key]);
    draw();
  });
  if (label) label.textContent = fmt(target()[key]);
}
const ringsParams = () => state.shapeParams.rings;
```

Replace lines 93–97:

```js
bindRange("rings", "ringsVal", "rings", v => v, ringsParams);
bindRange("symmetry", "symVal", "symmetry", v => v, ringsParams);
bindRange("rotation", "rotVal", "rotation", v => v + "°");
bindRange("emojiSize", "sizeVal", "emojiSize", v => v + "px");
bindRange("spacing", "spaceVal", "spacing", v => (v/100).toFixed(1) + "×", ringsParams);
```

Alternate listener (lines 108–111):

```js
document.getElementById("alternate").addEventListener("change", e => {
  ringsParams().alternate = e.target.checked;
  draw();
});
```

Shuffle (lines 118–135). Keep the same ranges and the same order; only the target changes:

```js
document.getElementById("shuffle").addEventListener("click", () => {
  const p = ringsParams();
  p.rings = 3 + Math.floor(Math.random()*9);
  p.symmetry = 4 + Math.floor(Math.random()*18);
  state.rotation = Math.floor(Math.random()*360);
  p.spacing = 60 + Math.floor(Math.random()*90);
  p.alternate = Math.random() > 0.4;
  state.faceOutward = Math.random() > 0.6;

  document.getElementById("rings").value = p.rings;
  document.getElementById("ringsVal").textContent = p.rings;
  document.getElementById("symmetry").value = p.symmetry;
  document.getElementById("symVal").textContent = p.symmetry;
  document.getElementById("rotation").value = state.rotation;
  document.getElementById("rotVal").textContent = state.rotation + "°";
  document.getElementById("spacing").value = p.spacing;
  document.getElementById("spaceVal").textContent = (p.spacing/100).toFixed(1) + "×";
  document.getElementById("alternate").checked = p.alternate;
  document.getElementById("faceOutward").checked = state.faceOutward;
  // ... rest (palette shuffle, draw) unchanged
```

- [ ] **Step 6: Check that no old readers remain**

Run: `grep -rnE "state\.(rings|symmetry|spacing|alternate)\b" js/`
Expected: no output.

- [ ] **Step 7: Run tests**

Run: `node --test`
Expected: all pass. If the equivalence test fails on `font`, the scale or
font expression differs in float order from the reference. Fix the
implementation, not the test.

- [ ] **Step 8: Commit**

```bash
git add js/draw.js js/state.js js/main.js tests/render.test.mjs
git commit -m "Render through shape engine; move rings settings to state.shapeParams"
```

---

### Task 4: Pixel-diff, browser check, merge

Run by the orchestrating session. Don't rely on subagent reports: look at
every image.

- [ ] **Step 1: Unit tests on the branch head**

Run: `node --test` in the worktree. Expected: all pass. Paste the summary line into the merge notes.

- [ ] **Step 2: Pixel-diff against the baseline**

```bash
cd ~/.tools/playwright
node pixeldiff.mjs compare <worktree> baselines/shapes-slice1 <scratchpad>/slice1-after
```
Expected: exit 0. Every combination must be `pass: true` (under 0.5% of pixels
differing by more than 8/255), with no `pageerror` and no `console:` errors
other than those recorded in Task 0 Step 3. Read all 8 `*.png` and all 8
`*.diff.png`. Red pixels on a diff should be absent or isolated antialiasing
specks, not whole emoji. If a combination fails or a diff shows a displaced or
recoloured emoji, use superpowers:systematic-debugging. Do not raise the threshold.

- [ ] **Step 3: Interactive check (Review Focus 4)**

Run `node check.mjs <worktree> <scratchpad>/slice1-check.png` (existing
script: console errors, plus whether Alternate and Face outward change the
canvas). Expected: `errors` holds only the pre-existing ones,
`alternate_changed: true`, `faceOutward_changed: true`.
Then write a short one-off script in the scratchpad, based on `check.mjs`, that:
moves `rings`, `symmetry` and `spacing` one at a time, and checks that each move
changes the canvas hash and that the label text matches the value
(`ringsVal`, `symVal`, `spaceVal` = `(v/100).toFixed(1)+"×"`); clicks
`#shuffle` 3 times, checking each time that the canvas changes and that the
labels match the slider values; and confirms no page errors. Look at a
screenshot taken after Shuffle.

- [ ] **Step 4: Review and merge**

Ask for an Opus whole-branch code review (superpowers:requesting-code-review)
against this plan and spec §6 item 1, then use
superpowers:finishing-a-development-branch. After merging, tick slice 1 in
`ROADMAP.md`, change "(next: write its plan)" to note that slice 2 is next, and
commit:

```bash
git add ROADMAP.md
git commit -m "ROADMAP: slice 1 (shape engine) done"
```
