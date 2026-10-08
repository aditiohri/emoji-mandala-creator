# Mandala Shapes — Slice 2 (Pattern, fit, palette rules, toggles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The toggle switches work by clicking the visible pill; every ring
gets a symmetric emoji pattern from the front of the palette and is fitted so
nothing overlaps; guide rings and the Backdrop select go (Soft glow becomes a
switch); the palette shows which emoji are in use and can be reordered by
drag or keyboard.

**Architecture:** `assignEmoji` (pure, `js/pattern.js`) replaces
`assignLegacy`. `js/shapes/lib.js` gains the fit helpers; `rings.layout`
uses them and gains the decided spacing semantics. `renderTo` returns
`{ used }`; `main.js` wraps `draw()` so every redraw updates the palette cue.
Drag-to-reorder lives in `js/palette.js` with Pointer Events.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and
`node:assert/strict`, run with `node --test` (Node 24). Browser checks use
Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`
(§1 decisions incl. "Toggle switches", §3 Emoji assignment + Fitting +
Renderer + State, §4 UI, §5 Concentric rings, §6 item 2, §7). Read it before
starting any task.

**Provenance:** every code block in this plan was run in a scratch copy of
the repo before the plan was written: `node --test` passed (43 tests) and
`slice2.mjs` (Task 7) printed `ALL PASS`. If something here fails for you,
suspect a transcription slip first, and report it rather than redesigning.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo. Plain ES modules.
- `js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js` or the DOM.
- Run tests with **`node --test`** from the repo root. Do not use `node --test tests/`; it does not work.
- Test files are `tests/*.test.mjs`, using `node:test` and `node:assert/strict`.
- `draw()` keeps its callers; it now returns `{ used }`. `draw.js` keeps exporting `canvas`, `ctx`, `initCanvas`, `renderTo`.
- At most **6** distinct emoji per shape, **first N in palette order** (`maxEmoji` 6 for rings).
- Fit floor: `floor = max(MIN_SCALE, minFont/emojiSize)`, `MIN_SCALE = 0.55`; center emoji scale is always 1.05.
- Every UI check uses **real Playwright locator clicks, mouse drags, key presses or touches on the visible element**. Never set `.checked`/`.value` or call `el.click()` from `page.evaluate`: that is how the unclickable switches went unnoticed.
- Switch markup is `<label class="switch"><input type="checkbox" id="…"><span class="slider-pill"></span></label>`.
- Copy: rings Alternate switch reads **"Stagger alternate rings"**; glow switch reads **"Soft glow"**; cue reads "Concentric rings is using 4 of your 9 emoji — drag one forward to use it" / "Concentric rings is using all 3 of your emoji".
- `localStorage` key for glow: **`mandala.glow`** (`"true"`/`"false"`), wrapped in try/catch like the background keys.
- Worktree agents must first check that `js/palette.js`, `js/backgrounds.js`, `js/usage.js`, `js/shapes/rings.js` and `js/pattern.js` exist and that `git log --oneline -3` shows the slice 2 plan commit. If not, you branched from the wrong commit; stop.
- In shell, `ls` is aliased to a tool that rejects paths. Use `command ls`. macOS has no `timeout` command.

## Review Focus

Failure modes the per-task unit tests could miss, each with its owning check:

1. **A tap on × must still remove the chip** once chips listen for pointerdown (capture is taken only after 6 px). → Task 6 Step 4 browser check, mouse and touch (`slice2.mjs` section 2).
2. **Keyboard reorder must keep focus** on the moved chip after the list is rebuilt, or arrow-key reordering stops after one step. → Task 6 Step 4 (`focus stays on the moved chip`).
3. **Glow must persist per device and the switch must reflect it on load.** A stored `"false"` has to leave the switch unchecked and the canvas without glow. → Task 3 Step 6 manual reload check.
4. **Spacing must not have a dead range at roomy settings** (it did above 1.0×). → Task 4 test `the slider has no dead range` and `slice2.mjs` slider click on spacing at defaults.
5. **Dimmed chips must match what is drawn** after every kind of palette change (add, remove, Shuffle, reorder). The cue runs from the `draw()` wrapper, after chips are rebuilt. → Task 5 Step 4 and `slice2.mjs` section 2 (`still 2 chips dimmed after reorder`).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `index.html` | modify | switches as `<label class="switch">`; rename Alternate; remove Backdrop; Soft glow switch in Background; `#paletteCue` |
| `styles.css` | modify | `.switch` inline-block + focus ring; chip `unused` / `dragging` / `drop-target` / focus; `.palette-cue` |
| `js/pattern.js` | rewrite | `assignEmoji(groups, palette, maxEmoji)`; `assignLegacy` deleted |
| `js/shapes/lib.js` | modify | `MIN_SCALE`, `fitFloor`, `chord`, `fitRing`, `fitGap` |
| `js/shapes/rings.js` | rewrite | fitted layout, spacing semantics, new label; no `guides`, no `ring` field |
| `js/draw.js` | modify | `assignEmoji`; `glow` replaces `backdrop`/`guideRings`; returns `{ used }` |
| `js/backgrounds.js` | modify | `opts.glow`; guide-ring branch deleted |
| `js/state.js` | modify | `glow: true` replaces `backdrop` |
| `js/palette.js` | modify | `moveItem`, `cueText`, `updatePaletteCue`, drag + keyboard reorder |
| `js/main.js` | modify | `draw()` wrapper updates cue; glow switch + persistence; Backdrop listener removed |
| `tests/pattern.test.mjs` | rewrite | assignEmoji |
| `tests/fit.test.mjs` | create | fit helpers |
| `tests/shapes.test.mjs` | rewrite | rings layout + full sweep |
| `tests/render.test.mjs` | rewrite | renderer on assignEmoji, `used`, glow, state |
| `tests/backgrounds.test.mjs` | modify | glow instead of backdrop/guide rings |
| `tests/palette.test.mjs` | create | `moveItem`, `cueText` |
| `~/.tools/playwright/clicks.mjs` | create (outside repo) | real-click switch test |
| `~/.tools/playwright/slice2.mjs` | create (outside repo) | end-of-slice browser check + screenshots |

**Models:** Task 1 and Task 5 are mechanical (Haiku is fine); Tasks 2, 3, 4,
6 are Sonnet. Task 7's screenshot judgement is the orchestrator's (Opus), not
a subagent's.

---

### Task 0: Worktree

- [ ] **Step 1:** Use superpowers:using-git-worktrees. Create branch `shapes-slice-2` from `main` (which includes this plan). Run the Global Constraints file check.
- [ ] **Step 2:** Run `node --test`. Expected: all pass (slice 1 suite).

---

### Task 1: Clickable toggle switches

The switch is a `<div class="switch">` around a 0×0 checkbox, so clicking the
visible pill does nothing; only the text label works. Make the switch a
`<label>`. Also rename the Alternate switch (spec §1).

**Files:**
- Create: `~/.tools/playwright/clicks.mjs`
- Modify: `index.html:104-118`, `styles.css:277-303`, `js/shapes/rings.js:15`, `tests/shapes.test.mjs` (label assertion)

**Interfaces:**
- Produces: the switch markup in Global Constraints (Task 3 reuses it for Soft glow); `clicks.mjs <app-dir>` (exit 0 = every switch flips by pill and by label click and redraws).

- [ ] **Step 1: Write the failing browser test**

`~/.tools/playwright/clicks.mjs`:

```js
// usage: node clicks.mjs <app-dir>
// Real mouse clicks on every switch's visible pill, then on its text label.
// Each click must flip the checkbox and change the canvas. Exit 1 on failure.
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";

const dir = path.resolve(process.argv[2]);
const T = {".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/json"};
const srv = http.createServer((q, r) => {
  const p = path.join(dir, q.url === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream" }); r.end(d); });
}).listen(0);

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = []; pg.on("pageerror", e => errs.push(e.message));
await pg.goto(`http://localhost:${srv.address().port}/`); await pg.waitForTimeout(600);
const pixels = () => pg.evaluate(() => document.getElementById("canvas").toDataURL());

let fail = 0;
const ids = await pg.$$eval(".toggle-row input[type=checkbox]", els => els.map(e => e.id));
if (ids.length === 0) { console.log("FAIL no switches found"); fail++; }
for (const id of ids) {
  for (const [what, loc] of [["pill", pg.locator(`.toggle-row:has(#${id}) .slider-pill`)],
                             ["label", pg.locator(`label[for="${id}"]`)]]) {
    const before = await pg.isChecked(`#${id}`), px = await pixels();
    await loc.click({ timeout: 2000 }).catch(e => console.log(`  click error: ${e.message.split("\n")[0]}`));
    await pg.waitForTimeout(100);
    const after = await pg.isChecked(`#${id}`), changed = (await pixels()) !== px;
    const ok = after !== before && changed;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} ${id} ${what}: checked ${before} -> ${after}, canvas changed ${changed}`);
  }
}
console.log("console errors:", errs); if (errs.length) fail++;
await b.close(); srv.close();
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it against the worktree; it must fail on the pills**

Run: `cd ~/.tools/playwright && node clicks.mjs <worktree>`
Expected: exit 1, with
```
FAIL alternate pill: checked true -> true, canvas changed false
PASS alternate label: ...
FAIL faceOutward pill: checked false -> false, canvas changed false
PASS faceOutward label: ...
```

- [ ] **Step 3: Change the markup**

In `index.html`, replace the two toggle rows with:

```html
      <div class="toggle-row">
        <label for="alternate">Stagger alternate rings</label>
        <label class="switch">
          <input type="checkbox" id="alternate" checked>
          <span class="slider-pill"></span>
        </label>
      </div>

      <div class="toggle-row">
        <label for="faceOutward">Rotate emoji outward</label>
        <label class="switch">
          <input type="checkbox" id="faceOutward">
          <span class="slider-pill"></span>
        </label>
      </div>
```

In `styles.css`, `.switch` gets `display:inline-block;` as its first
declaration (a `<label>` is inline, so width/height would be ignored), and
add after the `:checked + .slider-pill::before` rule:

```css
.switch input:focus-visible + .slider-pill{ outline:2px solid var(--coral); outline-offset:2px; }
```

In `js/shapes/rings.js`:
`alternate: { label: "Stagger alternate rings", default: true },`

In `tests/shapes.test.mjs`, test `rings controls match the spec`:
`assert.deepEqual(rings.alternate, { label: "Stagger alternate rings", default: true });`

- [ ] **Step 4: Run both test suites**

Run: `node --test` → all pass.
Run: `cd ~/.tools/playwright && node clicks.mjs <worktree>` → exit 0, four `PASS` lines (`pill` and `label` for `alternate` and `faceOutward`).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/shapes/rings.js tests/shapes.test.mjs
git commit -m "Make toggle switches clickable on the pill; rename Alternate to 'Stagger alternate rings'"
```

---

### Task 2: `assignEmoji`

**Files:**
- Modify: `js/pattern.js` (add `assignEmoji`; keep `assignLegacy` until Task 3)
- Rewrite: `tests/pattern.test.mjs`

**Interfaces:**
- Produces: `assignEmoji(groups, palette, maxEmoji) → { emojiFor(group, index) → string, used: Set<number> }`. `palette` is non-empty. `groups[g] = { size, kind: "cycle"|"solid", slot?, reverse? }`. `used` holds palette indices.

- [ ] **Step 1: Write the failing tests**

Replace `tests/pattern.test.mjs` with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignEmoji } from "../js/pattern.js";

const P = ["a", "b", "c", "d", "e", "f", "g", "h"];
const center = { size: 1, kind: "solid", slot: 0 };
const cyc = (size, reverse = false) => ({ size, kind: "cycle", reverse });

test("only the first min(maxEmoji, 6) palette entries appear", () => {
  const groups = [center, cyc(10), cyc(12), cyc(9), cyc(7), cyc(8), cyc(6), cyc(5)];
  for (const maxEmoji of [1, 2, 4, 6, 8]) {
    const { emojiFor } = assignEmoji(groups, P, maxEmoji);
    const allowed = P.slice(0, Math.min(maxEmoji, 6));
    groups.forEach((g, gi) => { for (let i = 0; i < g.size; i++) assert.ok(allowed.includes(emojiFor(gi, i)), `${maxEmoji} ${gi} ${i}`); });
  }
});

test("period: 2 if it divides size, else 3, else solid", () => {
  const { emojiFor } = assignEmoji([cyc(10), cyc(9), cyc(7)], P, 6);
  // size 10 -> p 2, base 0: a b a b ...
  assert.deepEqual([0, 1, 2, 3].map(i => emojiFor(0, i)), ["a", "b", "a", "b"]);
  // size 9 -> p 3, base 1: b c d b c d ...
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => emojiFor(1, i)), ["b", "c", "d", "b", "c", "d"]);
  // size 7 (prime) -> p 1, base 2
  assert.ok([0, 1, 2, 3, 4, 5, 6].every(i => emojiFor(2, i) === "c"));
});

test("a cycle group repeats with its period and the period divides size", () => {
  for (const size of [3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 24]) for (const U of [1, 2, 3, 6]) {
    const { emojiFor } = assignEmoji([cyc(size)], P.slice(0, U), 6);
    const seq = Array.from({ length: size }, (_, i) => emojiFor(0, i));
    const p = new Set(seq).size;
    assert.equal(size % p, 0, `size ${size} U ${U}`);
    for (let i = 0; i + p < size; i++) assert.equal(seq[i], seq[i + p], `size ${size} U ${U}`);
  }
});

test("period 3 needs at least 3 emoji", () => {
  const { emojiFor } = assignEmoji([cyc(9)], ["x", "y"], 6);
  assert.ok([0, 1, 2, 3].every(i => emojiFor(0, i) === "x"));
});

test("slot-less neighbouring groups start on different emoji when U >= 2", () => {
  for (const U of [2, 3, 4, 6]) {
    const groups = [center, cyc(10), cyc(10), cyc(9), cyc(7), cyc(12), cyc(10)];
    const { emojiFor } = assignEmoji(groups, P.slice(0, U), 6);
    // "Differ" = different base emoji (spec §3 Adjacency); with U = 2 two
    // period-2 rings share both emoji, out of phase.
    for (let g = 1; g < groups.length; g++) {
      assert.notEqual(emojiFor(g - 1, 0), emojiFor(g, 0), `U ${U} g ${g}`);
    }
  }
});

test("slots set the base and slotted neighbours differ when U >= maxEmoji", () => {
  const groups = [{ size: 1, kind: "solid", slot: 0 }, { size: 6, kind: "cycle", slot: 2 }, { size: 4, kind: "solid", slot: 4 }];
  const { emojiFor } = assignEmoji(groups, P, 6);
  assert.equal(emojiFor(0, 0), "a");
  assert.equal(emojiFor(1, 0), "c");
  assert.equal(emojiFor(2, 3), "e");
});

test("reverse reverses a period-3 cycle and is a no-op for period 2", () => {
  const { emojiFor } = assignEmoji([cyc(9, false), cyc(9, true)], P, 6);
  // group 1 base 1: forward would be b c d; reversed is b d c
  assert.deepEqual([0, 1, 2, 3].map(i => emojiFor(1, i)), ["b", "d", "c", "b"]);
  const two = assignEmoji([cyc(10, false), cyc(10, true)], P, 6);
  assert.deepEqual([0, 1, 2].map(i => two.emojiFor(1, i)), ["b", "c", "b"]);
});

test("used lists exactly the palette indices drawn", () => {
  // center a(0); ring 10 -> base 1, p 2 -> 1,2; ring 7 -> base 2, solid -> 2
  const { used } = assignEmoji([center, cyc(10), cyc(7)], P, 6);
  assert.deepEqual([...used].sort((x, y) => x - y), [0, 1, 2]);
  // a group fitted with a slot that skips 0
  const skip = assignEmoji([{ size: 6, kind: "cycle", slot: 1 }], P, 6);
  assert.deepEqual([...skip.used].sort((x, y) => x - y), [1, 2]);
});

test("U = 1 and size = 1 work", () => {
  const { emojiFor, used } = assignEmoji([center, cyc(1), cyc(10)], ["x"], 6);
  assert.equal(emojiFor(0, 0), "x"); assert.equal(emojiFor(1, 0), "x"); assert.equal(emojiFor(2, 9), "x");
  assert.deepEqual([...used], [0]);
});

test("deterministic", () => {
  const groups = [center, cyc(12), cyc(9, true)];
  const a = assignEmoji(groups, P, 6), b = assignEmoji(groups, P, 6);
  for (let g = 0; g < 3; g++) for (let i = 0; i < groups[g].size; i++) assert.equal(a.emojiFor(g, i), b.emojiFor(g, i));
});
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `pattern.test.mjs` fails with `SyntaxError: The requested module '../js/pattern.js' does not provide an export named 'assignEmoji'`.

- [ ] **Step 3: Implement**

Append to `js/pattern.js` (leave `assignLegacy` in place; Task 3 deletes it):

```js
// Emoji assignment (spec §3): each group gets a symmetric repeating pattern
// drawn from the first few palette entries.
export function assignEmoji(groups, palette, maxEmoji){
  const use = palette.slice(0, Math.min(maxEmoji, palette.length, 6));
  const U = use.length;
  const plan = groups.map((g, gi) => {
    let p = 1;
    if (g.kind === "cycle") p = [2, 3].find(c => c <= U && g.size % c === 0) ?? 1;
    return { base: (g.slot ?? gi) % U, p, reverse: !!g.reverse };
  });
  const slotFor = (g, i) => {
    const { base, p, reverse } = plan[g];
    const k = reverse ? (p - i % p) % p : i % p;
    return (base + k) % U;
  };
  const used = new Set();
  groups.forEach((g, gi) => { for (let i = 0; i < g.size; i++) used.add(slotFor(gi, i)); });
  return { emojiFor: (g, i) => use[slotFor(g, i)], used };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add js/pattern.js tests/pattern.test.mjs
git commit -m "Add assignEmoji: symmetric per-group patterns from the front of the palette"
```

---

### Task 3: Renderer on `assignEmoji`; Soft glow switch replaces Backdrop

**Files:**
- Modify: `js/draw.js`, `js/backgrounds.js`, `js/state.js`, `js/pattern.js`, `index.html`, `js/main.js`
- Rewrite: `tests/render.test.mjs`
- Modify: `tests/backgrounds.test.mjs`

**Interfaces:**
- Consumes: `assignEmoji` (Task 2); switch markup (Task 1).
- Produces: `renderTo(ctx, W, opts) → { used }` with `opts.glow: boolean` (no `backdrop`); `draw() → { used }`; `drawBackground(ctx, W, H, { background, glow, emojiSize }) → dark`; `state.glow` (default `true`, no `state.backdrop`).

- [ ] **Step 1: Write the failing tests**

Replace `tests/render.test.mjs` with:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTo } from "../js/draw.js";
import { getShape } from "../js/shapes/index.js";
import { assignEmoji } from "../js/pattern.js";
import { state, DEFAULT_PALETTE } from "../js/state.js";
import rings from "../js/shapes/rings.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

// Records the translate/rotate in effect at each fillText, and arcs drawn.
function mockCtx(){
  const calls = [], arcs = []; let t = { x: 0, y: 0, r: 0 }; const stack = [];
  return {
    calls, arcs, font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "", textBaseline: "",
    save(){ stack.push({ ...t }); }, restore(){ t = stack.pop(); },
    translate(x, y){ if (t.r !== 0) throw new Error("translate after rotate"); t = { ...t, x: t.x + x, y: t.y + y }; },
    rotate(a){ t = { ...t, r: t.r + a }; },
    fillText(text, x, y){ calls.push({ text, font: this.font, x: t.x + x, y: t.y + y, r: t.r }); },
    clearRect(){}, fillRect(){}, beginPath(){}, fill(){}, stroke(){},
    arc(x, y, r){ arcs.push(r); },
    createRadialGradient(){ return { addColorStop(){} }; },
    createLinearGradient(){ return { addColorStop(){} }; },
  };
}

const params = { rings: 6, symmetry: 10, spacing: 100, alternate: true };
function render(over = {}){
  const ctx = mockCtx();
  const out = renderTo(ctx, 1000, {
    shape: rings, params, palette: [...DEFAULT_PALETTE], background: { type: "solid", color: "#000000" }, glow: false,
    emojiSize: 44, rotation: 0, centerMode: "emoji", faceOutward: false, minFont: 14, ...over,
  });
  return { ctx, out };
}
const layoutFor = (over = {}) => rings.layout({ ...params, centerMode: "emoji", radius: 1000 / 2 - 44 * 0.9, emojiSize: 44, minFont: 14, ...over });

test("draws each placement with assignEmoji's emoji, in order, at its position", () => {
  for (const rotation of [0, 37]) {
    const { ctx } = render({ rotation });
    const { placements, groups } = layoutFor();
    const { emojiFor } = assignEmoji(groups, DEFAULT_PALETTE, rings.maxEmoji);
    const rot = rotation * Math.PI / 180;
    assert.equal(ctx.calls.length, placements.length);
    placements.forEach((p, i) => {
      const c = ctx.calls[i];
      assert.equal(c.text, emojiFor(p.group, p.index));
      assert.equal(c.font, Math.max(14, 44 * p.scale) + FONT);
      assert.ok(Math.abs(c.x - (500 + p.x * Math.cos(rot) - p.y * Math.sin(rot))) < 1e-6);
      assert.ok(Math.abs(c.y - (500 + p.x * Math.sin(rot) + p.y * Math.cos(rot))) < 1e-6);
    });
  }
});

test("default palette at defaults: at most 6 emoji, rings are symmetric", () => {
  const { ctx } = render();
  assert.equal(ctx.calls[0].text, "✨");
  assert.ok(new Set(ctx.calls.map(c => c.text)).size <= 6);
  // ring 1 (10 spokes, period 2) alternates two emoji
  const ring1 = ctx.calls.slice(1, 11).map(c => c.text);
  assert.deepEqual(ring1, Array.from({ length: 10 }, (_, i) => DEFAULT_PALETTE[1 + i % 2]));
});

test("returns used from the assigner", () => {
  const { out } = render();
  const { groups } = layoutFor();
  assert.deepEqual([...out.used].sort(), [...assignEmoji(groups, DEFAULT_PALETTE, 6).used].sort());
  const three = render({ palette: ["x", "y", "z"] }).out.used;
  assert.deepEqual([...three].sort(), [0, 1, 2]);
});

test("empty palette falls back to DEFAULT_PALETTE", () => {
  const { ctx } = render({ palette: [] });
  assert.equal(ctx.calls[0].text, DEFAULT_PALETTE[0]);
  assert.ok(ctx.calls.every(c => typeof c.text === "string"));
});

test("face outward rotates ring emoji by heading + rot + pi/2, never the center", () => {
  const { ctx } = render({ faceOutward: true, rotation: 30 });
  const { placements } = layoutFor();
  const rot = 30 * Math.PI / 180;
  assert.equal(ctx.calls[0].r, 0);
  placements.forEach((p, i) => { if (p.heading !== null) assert.ok(Math.abs(ctx.calls[i].r - (p.heading + rot + Math.PI / 2)) < 1e-9); });
  assert.ok(render().ctx.calls.every(c => c.r === 0));
});

test("glow option reaches the background", () => {
  assert.equal(render({ glow: true }).ctx.arcs.length, 1);
  assert.equal(render({ glow: false }).ctx.arcs.length, 0);
});

test("state: rings params under shapeParams, glow replaces backdrop", () => {
  assert.equal(state.shape, "rings");
  const defaults = Object.fromEntries(rings.controls.map(c => [c.key, c.default]));
  assert.deepEqual(state.shapeParams.rings, { ...defaults, alternate: rings.alternate.default });
  for (const k of ["rings", "symmetry", "spacing", "alternate", "backdrop"]) assert.ok(!(k in state), k);
  assert.equal(state.glow, true);
  assert.equal(getShape(state.shape), rings);
});
```

Replace `tests/backgrounds.test.mjs` with:

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

test("returns dark for dark solid, light for light solid", () => {
  const opts = { glow: false, emojiSize: 44 };
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#000000" } }), true);
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#ffffff" } }), false);
});

test("glow draws one circle of radius maxR*1.05; no glow draws none", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, { background: { type: "solid", color: "#000000" }, glow: true, emojiSize: 20 });
  assert.deepEqual(ctx.calls.map(c => c.r), [(500 - 20 * 0.9) * 1.05]);
  const off = mockCtx();
  drawBackground(off, 1000, 1000, { background: { type: "solid", color: "#000000" }, glow: false, emojiSize: 20 });
  assert.deepEqual(off.calls, []);
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

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `render.test.mjs` fails (text mismatch on ring emoji; `used` undefined; `state.glow` missing); `backgrounds.test.mjs` "glow draws one circle" fails (no arc with `glow: true`).

- [ ] **Step 3: Implement the renderer and background**

`js/draw.js` becomes:

```js
import { state, DEFAULT_PALETTE } from "./state.js";
import { drawBackground } from "./backgrounds.js";
import { getShape } from "./shapes/index.js";
import { assignEmoji } from "./pattern.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

export let canvas = null;
export let ctx = null;

export function initCanvas(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

// Draw a mandala on any square canvas of side W.
// opts = { shape, params, palette, background, glow, emojiSize,
//          rotation (degrees), centerMode, faceOutward, minFont }
// Returns { used }: the palette indices drawn.
export function renderTo(ctx, W, opts){
  const { shape, params, emojiSize, minFont, faceOutward } = opts;
  ctx.clearRect(0, 0, W, W);
  const dark = drawBackground(ctx, W, W, {
    background: opts.background, glow: opts.glow, emojiSize,
  });

  const cx = W/2, cy = W/2;
  const radius = W/2 - emojiSize*0.9;
  const rot = opts.rotation * Math.PI/180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const palette = opts.palette.length ? opts.palette : DEFAULT_PALETTE;

  const { placements, groups } = shape.layout({ ...params, centerMode: opts.centerMode, radius, emojiSize, minFont });
  const { emojiFor, used } = assignEmoji(groups, palette, shape.maxEmoji);

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
  return { used };
}

export function draw(){
  return renderTo(ctx, canvas.width, {
    shape: getShape(state.shape),
    params: state.shapeParams[state.shape],
    palette: state.palette,
    background: state.background,
    glow: state.glow,
    emojiSize: state.emojiSize,
    rotation: state.rotation,
    centerMode: state.centerMode,
    faceOutward: state.faceOutward,
    minFont: 14,
  });
}
```

`js/backgrounds.js`: the comment above `drawBackground` becomes
`// Draw the canvas background. opts = { background, glow, emojiSize }`; the
`// Draw backdrop (soft glow or rings) on top` block becomes:

```js
  // Soft glow on top
  if (opts.glow){
    const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,maxR*1.05);
    if (dark){
      grad.addColorStop(0, "rgba(139,107,255,0.16)");
      grad.addColorStop(1, "rgba(139,107,255,0)");
    } else {
      grad.addColorStop(0, "rgba(255,107,74,0.10)");
      grad.addColorStop(1, "rgba(255,107,74,0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx,cy,maxR*1.05,0,Math.PI*2);
    ctx.fill();
  }
```

(i.e. the `else if (opts.backdrop === "rings")` guide-circle branch is deleted.)

`js/state.js`: replace `backdrop: "soft",` with `glow: true,`.

`js/pattern.js`: delete `assignLegacy` and its comment; the file is now:

```js
// Emoji assignment (spec §3): each group gets a symmetric repeating pattern
// drawn from the first few palette entries.
export function assignEmoji(groups, palette, maxEmoji){
  const use = palette.slice(0, Math.min(maxEmoji, palette.length, 6));
  const U = use.length;
  const plan = groups.map((g, gi) => {
    let p = 1;
    if (g.kind === "cycle") p = [2, 3].find(c => c <= U && g.size % c === 0) ?? 1;
    return { base: (g.slot ?? gi) % U, p, reverse: !!g.reverse };
  });
  const slotFor = (g, i) => {
    const { base, p, reverse } = plan[g];
    const k = reverse ? (p - i % p) % p : i % p;
    return (base + k) % U;
  };
  const used = new Set();
  groups.forEach((g, gi) => { for (let i = 0; i < g.size; i++) used.add(slotFor(gi, i)); });
  return { emojiFor: (g, i) => use[slotFor(g, i)], used };
}
```

- [ ] **Step 4: Run unit tests**

Run: `node --test` → all pass.

- [ ] **Step 5: UI — Soft glow switch, Backdrop removed**

`index.html`: delete the whole Backdrop `.field` (the `<select id="backdrop">`
block). Inside the Background `.field`, directly after
`<div class="bg-presets" id="bgPresets"></div>`, add:

```html
        <div class="toggle-row">
          <label for="glow">Soft glow</label>
          <label class="switch">
            <input type="checkbox" id="glow" checked>
            <span class="slider-pill"></span>
          </label>
        </div>
```

`js/main.js`: replace the `document.getElementById("backdrop")` listener with:

```js
// Soft glow: saved per device, next to the background.
try {
  const storedGlow = localStorage.getItem("mandala.glow");
  if (storedGlow !== null) state.glow = storedGlow === "true";
} catch(e) {}
document.getElementById("glow").checked = state.glow;
document.getElementById("glow").addEventListener("change", e => {
  state.glow = e.target.checked;
  try { localStorage.setItem("mandala.glow", String(state.glow)); } catch(err) {}
  draw();
});
```

Run: `grep -rn "backdrop\|guideRings\|assignLegacy" js index.html` → no output
(`styles.css` keeps `#emojiDialog::backdrop`, which is unrelated).

- [ ] **Step 6: Browser check**

Run: `cd ~/.tools/playwright && node clicks.mjs <worktree>` → exit 0, now six
`PASS` lines (including `glow pill` and `glow label`).

Then check persistence with a throwaway script (real click, then reload):
```js
// ~/.tools/playwright/_glow.mjs — delete after use
import { chromium } from "playwright"; import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve(process.argv[2]);
const srv = http.createServer((q, r) => { const p = path.join(dir, q.url === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": p.endsWith(".js") ? "text/javascript" : p.endsWith(".css") ? "text/css" : "text/html" }); r.end(d); }); }).listen(0);
const b = await chromium.launch(); const pg = await (await b.newContext()).newPage();
await pg.goto(`http://localhost:${srv.address().port}/`); await pg.waitForTimeout(500);
await pg.locator(".toggle-row:has(#glow) .slider-pill").click();
const off = await pg.evaluate(() => document.getElementById("canvas").toDataURL());
await pg.reload(); await pg.waitForTimeout(500);
console.log("unchecked after reload:", !(await pg.isChecked("#glow")));
console.log("canvas matches glow-off:", off === await pg.evaluate(() => document.getElementById("canvas").toDataURL()));
await b.close(); srv.close();
```
Expected: both lines print `true`. Delete `_glow.mjs`.

- [ ] **Step 7: Commit**

```bash
git add js/draw.js js/backgrounds.js js/state.js js/pattern.js js/main.js index.html tests/render.test.mjs tests/backgrounds.test.mjs
git commit -m "Render with assignEmoji and return used; Soft glow switch replaces Backdrop and guide rings"
```

---

### Task 4: Fit helpers; rings fitted, seam-free, with decided spacing

Spacing semantics (spec §5, decided 2026-10-08): with `f = spacing/100` the
radial step is `min(f, 2-f)·radius/rings`. 1.0× spreads rings to the edge,
below packs them toward the center, above packs them toward the edge (open
center). Then fitting: rings never closer than an emoji at the floor scale
(step raised if needed, rings past `radius` dropped); each ring shrinks to
its chord, or at the floor is evenly re-spaced with fewer emoji; ring 1
shrinks against the center emoji, then all rings move out by any remaining
shortfall.

**Files:**
- Modify: `js/shapes/lib.js`
- Rewrite: `js/shapes/rings.js`, `tests/shapes.test.mjs`
- Create: `tests/fit.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces (`js/shapes/lib.js`): `MIN_SCALE = 0.55`; `fitFloor(emojiSize, minFont) → number`; `chord(r, count) → number`; `fitRing({ r, count, emojiPx, overlap, floor }) → { count, scale }` (count 0 = drop); `fitGap({ gap, emojiPx, overlap, other?, floor }) → scale` in `[floor, 1]`. Slices 3–6 reuse these.
- Produces (`rings.layout`): no `guides` key; groups are `{ size, kind, slot? , reverse? }` with no `ring` field.

- [ ] **Step 1: Write the failing tests**

Create `tests/fit.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_SCALE, fitFloor, chord, fitRing, fitGap } from "../js/shapes/lib.js";

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("fitFloor is max(0.55, minFont/emojiSize)", () => {
  assert.equal(MIN_SCALE, 0.55);
  assert.equal(fitFloor(44, 14), 0.55);
  assert.equal(fitFloor(20, 14), 0.7);
});

test("chord", () => {
  assert.ok(near(chord(10, 6), 10));
  assert.ok(near(chord(1, 2), 2));
});

test("fitRing: roomy ring keeps count and scale 1", () => {
  assert.deepEqual(fitRing({ r: 200, count: 10, emojiPx: 44, overlap: 0, floor: 0.55 }), { count: 10, scale: 1 });
});

test("fitRing: shrinks to the chord while above the floor", () => {
  const r = 50, count = 10; // chord ≈ 30.9
  const { count: n, scale } = fitRing({ r, count, emojiPx: 44, overlap: 0, floor: 0.55 });
  assert.equal(n, 10);
  assert.ok(near(scale, chord(r, count) / 44));
});

test("fitRing: below the floor, keeps the floor and re-spaces with fewer", () => {
  const { count, scale } = fitRing({ r: 40, count: 24, emojiPx: 44, overlap: 0, floor: 0.55 });
  assert.equal(scale, 0.55);
  assert.ok(chord(40, count) >= 0.55 * 44);
  assert.ok(chord(40, count + 1) < 0.55 * 44);
  assert.ok(count >= 3 && count < 24);
});

test("fitRing: drops the ring when fewer than 3 fit", () => {
  assert.equal(fitRing({ r: 5, count: 12, emojiPx: 44, overlap: 0, floor: 0.55 }).count, 0);
});

test("fitRing: overlap lowers the need", () => {
  const a = fitRing({ r: 50, count: 10, emojiPx: 44, overlap: 0, floor: 0.55 }).scale;
  const b = fitRing({ r: 50, count: 10, emojiPx: 44, overlap: 0.2, floor: 0.55 }).scale;
  assert.ok(b > a);
});

test("fitGap: same-scale neighbours, other-scale neighbour, clamped", () => {
  assert.ok(near(fitGap({ gap: 33, emojiPx: 44, overlap: 0, floor: 0.55 }), 0.75));
  // (1.05 + s)/2 * 44 = 44  ->  s = 0.95
  assert.ok(near(fitGap({ gap: 44, emojiPx: 44, overlap: 0, other: 1.05, floor: 0.55 }), 0.95));
  assert.equal(fitGap({ gap: 500, emojiPx: 44, overlap: 0, floor: 0.55 }), 1);
  assert.equal(fitGap({ gap: 1, emojiPx: 44, overlap: 0, floor: 0.55 }), 0.55);
});
```

Replace `tests/shapes.test.mjs` with:

```js
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
```

- [ ] **Step 2: Run, expect failure**

Run: `node --test`
Expected: `fit.test.mjs` fails to import `MIN_SCALE`; `shapes.test.mjs` fails to import `fitFloor`.

- [ ] **Step 3: Implement**

`js/shapes/lib.js` becomes:

```js
export function polar(r, angle){
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

// Smallest scale any fitted placement may have (spec §3 Fitting).
export const MIN_SCALE = 0.55;
export function fitFloor(emojiSize, minFont){
  return Math.max(MIN_SCALE, minFont / emojiSize);
}

// Distance between neighbours when `count` points are evenly spaced on radius r.
export function chord(r, count){
  return 2 * r * Math.sin(Math.PI / count);
}

// Evenly spaced ring: shrink to fit; below `floor`, keep `floor` and re-space
// with fewer points. count 0 means the ring is dropped (fewer than 3 fit).
export function fitRing({ r, count, emojiPx, overlap, floor }){
  const need = emojiPx * (1 - overlap);
  const scale = Math.min(1, chord(r, count) / need);
  if (scale >= floor) return { count, scale };
  let m = count;
  while (m >= 3 && chord(r, m) < floor * need) m--;
  return { count: m >= 3 ? m : 0, scale: floor };
}

// Largest scale s (≤ 1) for a group whose neighbour across a radial gap has
// scale `other` (default: the same scale s). Never below `floor`; callers check
// `gap` against the need at `floor` and move groups apart when it fails.
export function fitGap({ gap, emojiPx, overlap, other, floor }){
  const unit = gap / (emojiPx * (1 - overlap));
  const s = other === undefined ? unit : 2 * unit - other;
  return Math.max(floor, Math.min(1, s));
}
```

`js/shapes/rings.js` becomes:

```js
import { polar, fitFloor, fitRing, fitGap } from "./lib.js";

const CENTER_SCALE = 1.05;

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
  alternate: { label: "Stagger alternate rings", default: true },
  maxEmoji: 6,
  overlap: 0,
  layout({ rings, symmetry, spacing, alternate, centerMode, radius, emojiSize, minFont }){
    const overlap = this.overlap;
    const floor = fitFloor(emojiSize, minFont);
    const placements = [], groups = [];
    const center = centerMode === "emoji";
    if (center){
      groups.push({ size: 1, kind: "solid", slot: 0 });
      placements.push({ x: 0, y: 0, heading: null, scale: CENTER_SCALE, group: 0, index: 0 });
    }
    // Spacing: 1.0× spreads rings evenly from the center to `radius`. Below
    // 1.0× they pack toward the center; above, toward the edge (open center).
    const f = spacing / 100;
    let step = Math.min(f, 2 - f) * radius / rings;
    // Radial fit: rings never closer than an emoji at the floor scale.
    step = Math.max(step, emojiSize * floor * (1 - overlap));
    const gapCap = fitGap({ gap: step, emojiPx: emojiSize, overlap, floor });
    let inner = f > 1 ? Math.max(0, radius - rings * step) : 0;
    // Ring 1 vs the center emoji: shrink ring 1 first, then push rings out.
    let s1 = gapCap;
    if (center){
      s1 = Math.min(s1, fitGap({ gap: inner + step, emojiPx: emojiSize, overlap, other: CENTER_SCALE, floor }));
      const needC = emojiSize * (CENTER_SCALE + s1) / 2 * (1 - overlap);
      inner = Math.max(inner, needC - step);
    }
    for (let ring=1; ring<=rings; ring++){
      const r = inner + ring * step;
      if (r > radius) break;
      const base = Math.max(floor, 1 - (ring-1)*0.03);
      const cap = Math.min(base, gapCap, ring === 1 ? s1 : 1);
      const fit = fitRing({ r, count: symmetry, emojiPx: emojiSize, overlap, floor });
      if (fit.count === 0) continue;
      const n = fit.count;
      const scale = Math.min(cap, fit.scale);
      const alt = alternate && ring % 2 === 0;
      const dir = alt ? -1 : 1;
      const offset = alt ? Math.PI/n : 0;
      const group = groups.length;
      groups.push({ size: n, kind: "cycle", reverse: alt });
      for (let s=0; s<n; s++){
        const angle = dir * (s / n) * Math.PI*2 + offset;
        const { x, y } = polar(r, angle);
        placements.push({ x, y, heading: angle, scale, group, index: s });
      }
    }
    return { placements, groups };
  },
};
```

- [ ] **Step 4: Run, expect pass**

Run: `node --test` → all pass. The sweep in `shapes.test.mjs` checks every
pair of placements over 12 × 9 × 5 × 2 × 2 × 3 combinations; it takes a few
seconds.

- [ ] **Step 5: Commit**

```bash
git add js/shapes/lib.js js/shapes/rings.js tests/fit.test.mjs tests/shapes.test.mjs
git commit -m "Fit rings: shrink, re-space evenly, never overlap; spacing above 1.0x opens the center"
```

---

### Task 5: Palette cue

**Files:**
- Modify: `js/palette.js`, `js/main.js`, `index.html`, `styles.css`
- Create: `tests/palette.test.mjs`

**Interfaces:**
- Consumes: `draw() → { used }` (Task 3); `getShape(id).label`.
- Produces: `cueText(label, used, total) → string`; `updatePaletteCue(used: Set<number>, label)`; in `main.js`, a local `draw()` that calls the canvas draw and then `updatePaletteCue` — every existing `draw` call site in `main.js` stays as is and gets the cue for free.

- [ ] **Step 1: Write the failing test**

Create `tests/palette.test.mjs` with only the `cueText` test for now:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { cueText } from "../js/palette.js";

test("cueText", () => {
  assert.equal(cueText("Concentric rings", 4, 9), "Concentric rings is using 4 of your 9 emoji — drag one forward to use it");
  assert.equal(cueText("Concentric rings", 3, 3), "Concentric rings is using all 3 of your emoji");
  assert.equal(cueText("Concentric rings", 1, 1), "Concentric rings is using your 1 emoji");
});
```

- [ ] **Step 2: Run, expect failure** — `node --test`: no export `cueText`.

- [ ] **Step 3: Implement**

In `js/palette.js`, above `renderPaletteChips`, add:

```js
// Caption under the palette (spec §4 "Palette cue").
export function cueText(label, used, total){
  if (used >= total) return total === 1
    ? `${label} is using your 1 emoji`
    : `${label} is using all ${total} of your emoji`;
  return `${label} is using ${used} of your ${total} emoji — drag one forward to use it`;
}

// Dim the chips the mandala doesn't use and update the caption.
export function updatePaletteCue(used, label){
  document.querySelectorAll("#paletteChips .palette-chip").forEach((chip, i) => {
    chip.classList.toggle("unused", !used.has(i));
  });
  document.getElementById("paletteCue").textContent = cueText(label, used.size, state.palette.length);
}
```

`index.html`, directly after `<div class="palette-chips" id="paletteChips"></div>`:

```html
        <p class="hint palette-cue" id="paletteCue" aria-live="polite"></p>
```

`styles.css`, after the `.palette-chip button` rule:

```css
.palette-chip.unused{ opacity:0.4; }
.palette-cue{ margin:6px 0 0; }
```

`js/main.js`: change the imports to

```js
import { initCanvas, draw as drawCanvas } from "./draw.js";
import { getShape } from "./shapes/index.js";
import {
  renderPaletteChips,
  renderEmojiGrid,
  syncGridActiveStates,
  setupCustomEmojiInput,
  updatePaletteCue
} from "./palette.js";
```

and directly after `initCanvas();` add:

```js
// Redraw the canvas, then show which palette emoji it used.
function draw(){
  const { used } = drawCanvas();
  updatePaletteCue(used, getShape(state.shape).label);
}
```

(Function declarations are hoisted, so the existing calls such as
`renderPaletteChips(draw)` above it work unchanged. Every palette change in
`palette.js` re-renders the chips *before* calling back, so the dimming
applies to the new chips.)

- [ ] **Step 4: Run tests and look**

Run: `node --test` → all pass.
Load the app with Playwright at 1200×900 (fresh context), screenshot the
palette field. Expected: caption "Concentric rings is using 6 of your 8
emoji — drag one forward to use it", the last two chips dimmed. Click the ×
on the first chip (real click): caption stays "6 of your 7", a different
chip is now dimmed (the 7th).

- [ ] **Step 5: Commit**

```bash
git add js/palette.js js/main.js index.html styles.css tests/palette.test.mjs
git commit -m "Palette cue: dim unused chips and say how many emoji the shape uses"
```

---

### Task 6: Drag-to-reorder and keyboard reorder

Spec §4: Pointer Events for mouse and touch; chips `touch-action: none`; the
drag starts after 6 px and only then takes pointer capture (so a tap on ×
still reaches ×); during the drag the chip follows via `transform` and the
drop slot is outlined; the palette is reordered and the chips re-rendered
**only on `pointerup`**; with a chip focused, ←/→ move it.

Move/up listeners go on `window`, not the chip: before the 6 px threshold
there is no capture yet, so a mouse that slips off the chip would otherwise
lose the drag.

**Files:**
- Modify: `js/palette.js`, `styles.css`, `tests/palette.test.mjs`
- Create: `~/.tools/playwright/slice2.mjs` (its section 2 is this task's browser test; Task 7 runs the whole script)

**Interfaces:**
- Consumes: `renderPaletteChips(onChipChange)`; `onChipChange` is `main.js`'s `draw` wrapper (Task 5).
- Produces: `moveItem(arr, from, to) → arr` (in place).

- [ ] **Step 1: Write the failing unit test**

Add to `tests/palette.test.mjs` (and add `moveItem` to its import):

```js
test("moveItem moves forward and backward in place", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  const arr = ["a", "b"]; assert.equal(moveItem(arr, 0, 1), arr);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
});
```

Run `node --test` → fails (no export `moveItem`).

- [ ] **Step 2: Write the browser test**

Create `~/.tools/playwright/slice2.mjs`:

```js
// usage: node slice2.mjs <app-dir> <out-dir>
// Slice 2 browser check. Drives every control with real mouse clicks, drags,
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
const chips = pg => pg.$$eval("#paletteChips .palette-chip > span", s => s.map(x => x.textContent));
const shot = async (pg, name) => { const f = path.join(out, name + ".png"); await pg.locator("#canvas").screenshot({ path: f }); return f; };
// Real mouse/keyboard: click the slider to focus it, then Home/End.
async function slide(pg, id, key) { await pg.locator("#" + id).click(); await pg.keyboard.press(key); await pg.waitForTimeout(60); }

async function grid(name, cells, w = 300, cols = 4) {
  const html = `<body style="margin:0;background:#ddd;font:13px sans-serif"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px;padding:6px">` +
    cells.map(c => `<div><img src="data:image/png;base64,${fs.readFileSync(c.file).toString("base64")}" style="width:${w}px;height:${w}px;object-fit:contain;background:#fff"><div><b>${c.label}</b></div></div>`).join("") + "</div></body>";
  const pg = await b.newPage({ viewport: { width: cols * (w + 6) + 6, height: 300 } });
  await pg.setContent(html); await pg.waitForTimeout(200);
  const f = path.join(out, name + ".png"); await pg.screenshot({ path: f, fullPage: true }); await pg.close();
  console.log("wrote", f);
}

// 1. Every control by real click (desktop).
{
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
  for (const [id, valId] of [["spacing","spaceVal"],["rings","ringsVal"],["symmetry","symVal"],["rotation","rotVal"],["emojiSize","sizeVal"]]) {
    const px = await pixels(pg), v0 = await pg.inputValue("#" + id);
    const box = await pg.locator("#" + id).boundingBox();
    await pg.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2); await pg.waitForTimeout(80);
    const v1 = await pg.inputValue("#" + id), label = await pg.textContent("#" + valId);
    check(v1 !== v0 && (await pixels(pg)) !== px && label.startsWith(String(id === "spacing" ? (v1/100).toFixed(1) : v1)),
      `slider ${id}: click moves it (${v0} -> ${v1}), label "${label}", redraws`);
  }
  {
    const box = await pg.locator("#zoom").boundingBox();
    await pg.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2); await pg.waitForTimeout(80);
    const t = await pg.$eval(".canvas-wrap", e => e.style.transform);
    check(t.startsWith("scale(") && t !== "scale(1)", `zoom slider: click scales the canvas (${t})`);
    await pg.mouse.click(box.x + box.width * 0.333, box.y + box.height / 2);
  }
  { const px = await pixels(pg); await pg.selectOption("#centerMode", "empty"); await pg.waitForTimeout(80);
    check((await pixels(pg)) !== px, "center select redraws"); await pg.selectOption("#centerMode", "emoji"); }
  check(await pg.locator("#backdrop").count() === 0, "Backdrop select is gone");
  { const px = await pixels(pg); await pg.locator(".bg-preset").nth(2).click(); await pg.waitForTimeout(80);
    check((await pixels(pg)) !== px, "background swatch click redraws"); await pg.locator(".bg-preset").nth(0).click(); }
  { const n = (await chips(pg)).length; await pg.locator("#paletteChips .palette-chip button").last().click(); await pg.waitForTimeout(80);
    check((await chips(pg)).length === n - 1, "palette × click removes a chip"); }
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

// 2. Palette cue, drag to reorder (mouse, touch), keyboard, tap on ×.
{
  const pg = await open(DESKTOP);
  const cue = await pg.textContent("#paletteCue");
  check(/using 6 of your 8 emoji/.test(cue), `cue at defaults: "${cue}"`);
  check(await pg.locator("#paletteChips .palette-chip.unused").count() === 2, "2 chips dimmed at defaults");
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
  const n = keyed.length; await pg.locator("#paletteChips .palette-chip button").nth(2).click(); await pg.waitForTimeout(80);
  check((await chips(pg)).length === n - 1, "× still removes after drag code is attached");
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}
{
  const pg = await open(PHONE, { hasTouch: true, isMobile: true });
  const cdp = await pg.context().newCDPSession(pg);
  const before = await chips(pg);
  const last = await pg.locator("#paletteChips .palette-chip").last().boundingBox();
  const first = await pg.locator("#paletteChips .palette-chip").first().boundingBox();
  const pt = (x, y) => ({ touchPoints: [{ x, y }] });
  const sx = last.x + 12, sy = last.y + last.height / 2, ex = first.x + 8, ey = first.y + first.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", ...pt(sx, sy) });
  for (let k = 1; k <= 10; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", ...pt(sx + (ex - sx) * k / 10, sy + (ey - sy) * k / 10) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await pg.waitForTimeout(100);
  const after = await chips(pg);
  check(after[0] === before.at(-1), `touch drag moves last chip to front (${before.join("")} -> ${after.join("")})`);
  const n = after.length; await pg.locator("#paletteChips .palette-chip button").first().tap(); await pg.waitForTimeout(80);
  check((await chips(pg)).length === n - 1, "tap on × removes a chip");
  check(pg.errs.length === 0, `no console errors (${pg.errs.join(" | ")})`);
}

// 3. Each toggle at defaults, before/after, by real click.
{
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

// 4. Slider extremes, desktop and phone width.
for (const [vpName, vp] of [["desktop", DESKTOP], ["phone", PHONE]]) {
  const pg = await open(vp);
  const cells = [];
  for (const rk of ["Home", "End"]) for (const sk of ["Home", "End"]) for (const pk of ["Home", "End"]) for (const ek of ["Home", "End"]) {
    await slide(pg, "rings", rk); await slide(pg, "symmetry", sk); await slide(pg, "spacing", pk); await slide(pg, "emojiSize", ek);
    const label = `r${await pg.inputValue("#rings")} s${await pg.inputValue("#symmetry")} sp${await pg.inputValue("#spacing")} e${await pg.inputValue("#emojiSize")}`;
    cells.push({ file: await shot(pg, `${vpName}-${label.replace(/ /g, "_")}`), label });
  }
  await grid(`extremes-${vpName}`, cells, 300, 4);
  await pg.screenshot({ path: path.join(out, `page-${vpName}.png`), fullPage: true });
  const sw = await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  check(sw[0] <= sw[1], `${vpName}: no horizontal page scroll (${sw[0]} <= ${sw[1]})`);
  check(pg.errs.length === 0, `${vpName}: no console errors (${pg.errs.join(" | ")})`);
}

await b.close(); srv.close();
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
```

Run: `cd ~/.tools/playwright && node slice2.mjs <worktree> <scratchpad>/s2` —
expect section 2's drag/keyboard checks to `FAIL` (others may pass).

- [ ] **Step 3: Implement**

In `js/palette.js`, above `cueText`, add:

```js
// Move arr[from] to position `to` (in place); returns arr.
export function moveItem(arr, from, to){
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
  return arr;
}
```

Below `updatePaletteCue`, add:

```js
const DRAG_START_PX = 6;

function commitMove(from, to, onChipChange){
  moveItem(state.palette, from, to);
  renderPaletteChips(onChipChange);
  if (onChipChange) onChipChange();
}

// Drag (mouse or touch) and ←/→ keys reorder the palette.
function attachReorder(chip, i, onChipChange){
  chip.tabIndex = 0;
  chip.addEventListener("keydown", e => {
    const to = e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowRight" ? i + 1 : null;
    if (to === null) return;
    e.preventDefault();
    if (to < 0 || to >= state.palette.length) return;
    commitMove(i, to, onChipChange);
    document.querySelectorAll("#paletteChips .palette-chip")[to].focus();
  });
  chip.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    const chips = [...chip.parentElement.children];
    const centers = chips.map(c => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    let dragging = false, target = i;
    const move = ev => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!dragging){
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        dragging = true;
        // Capture only now, so a tap on × still reaches the × button.
        chip.setPointerCapture(ev.pointerId);
        chip.classList.add("dragging");
      }
      chip.style.transform = `translate(${dx}px, ${dy}px)`;
      let best = Infinity;
      centers.forEach((c, j) => {
        const d = Math.hypot(ev.clientX - c.x, ev.clientY - c.y);
        if (d < best){ best = d; target = j; }
      });
      chips.forEach((c, j) => c.classList.toggle("drop-target", j === target && j !== i));
    };
    const end = ev => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!dragging) return;
      // Reorder only on pointerup: renderPaletteChips rebuilds the list.
      if (ev.type === "pointerup" && target !== i){
        commitMove(i, target, onChipChange);
      } else {
        chip.classList.remove("dragging");
        chip.style.transform = "";
        chips.forEach(c => c.classList.remove("drop-target"));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}
```

In `renderPaletteChips`, after `chip.appendChild(remove);` add
`attachReorder(chip, i, onChipChange);` (before `wrap.appendChild(chip);`).

`styles.css`: add to the `.palette-chip` rule, before `display:inline-flex;`:

```css
  touch-action:none;
  user-select:none;
  -webkit-user-select:none;
  cursor:grab;
```

and after `.palette-chip.unused`:

```css
.palette-chip.dragging{
  position:relative;
  z-index:2;
  cursor:grabbing;
  box-shadow:0 4px 12px rgba(0,0,0,0.18);
}
.palette-chip.drop-target{ outline:2px dashed var(--coral); outline-offset:2px; }
.palette-chip:focus-visible{ outline:2px solid var(--coral); outline-offset:2px; }
```

- [ ] **Step 4: Run tests**

Run: `node --test` → all pass.
Run: `cd ~/.tools/playwright && node slice2.mjs <worktree> <out>` → every
line in sections 1–2 `PASS`, including `mouse drag moves last chip to front`,
`touch drag moves last chip to front`, `ArrowLeft on a focused chip moves it
left`, `focus stays on the moved chip`, `× still removes after drag code is
attached`, `tap on × removes a chip`. Final line `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add js/palette.js styles.css tests/palette.test.mjs
git commit -m "Drag (mouse/touch) and arrow keys reorder palette chips"
```

---

### Task 7: Browser check, screenshot review, merge (orchestrator)

This task is done by the orchestrating session, not a subagent: it must look
at every screenshot itself.

- [ ] **Step 1:** In the worktree, `node --test` → all pass. Run
`cd ~/.tools/playwright && node slice2.mjs <worktree> <scratchpad>/slice2`
→ `ALL PASS`, exit 0. Paste the full output into the report to the user.

- [ ] **Step 2: Judge by eye** (Read each PNG):
  - `toggles.png`: for each of Stagger, Face outward and Soft glow, the two
    tiles differ **at a glance** at default settings. Stagger: straight
    spokes vs staggered lattice. Face outward: 🦋🌊🔥🌙 visibly turn into a
    starburst. Glow: warm center vs flat. If any pair needs squinting, stop
    and ask the user.
  - `extremes-desktop.png`, `extremes-phone.png` (16 tiles each: rings 1/12 ×
    symmetry 3/24 × spacing 0.5×/1.5× × size 20/80): every ring is evenly
    spaced and uses a repeating pattern (no seam where it wraps); no two
    emoji overlap; nothing is clipped at the canvas edge.
  - `page-desktop.png`, `page-phone.png`: the Backdrop select is gone; Soft
    glow sits under the background swatches; the palette caption reads
    correctly and wraps; no horizontal scroll.
- [ ] **Step 3:** Request a whole-branch review (superpowers:requesting-code-review, Opus reviewer) against this plan and the spec; fix findings.
- [ ] **Step 4:** Update `ROADMAP.md`: tick **Slice 2** (merged date), tick
  the **Toggles** item with one line on the outcome (pill fixed with
  `<label class="switch">`; Alternate renamed "Stagger alternate rings";
  both toggles visible once colouring is symmetric), and remove the slice 1
  carry-over line (done). Add `clicks.mjs` and `slice2.mjs` to the
  browser-testing memory note.
- [ ] **Step 5:** superpowers:finishing-a-development-branch → merge `shapes-slice-2` into `main`.
