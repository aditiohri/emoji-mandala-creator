# Customizable mandala shapes — design

Status: approved (2026-10-08), revised after two reviews. Tracker: `ROADMAP.md` item 1.
Each slice in §6 gets its own implementation plan.

## 1. Intent

**Outcome.** People choose among several mandala shapes — concentric rings
(today), phyllotaxis spiral, lotus/rosette, yantra, kolam/rangoli lattice —
instead of only today's hardcoded rings.

**Success criterion (the user's words):** *"a visible, distinct, elegant
pattern every time, no matter what the user does."* Concretely, for every
shape and every combination of palette and control values:

1. Every group (ring, petal layer, band, ...) is rotationally symmetric —
   no seam where an emoji cycle wraps unevenly.
2. No two emoji overlap — **across the whole mandala, not just within a
   group** — beyond the overlap the shape deliberately allows.
3. At most N distinct emoji appear, taken from the front of the palette.
   The UI states exactly how many are in use.
4. Adjacent groups look different from each other (when ≥ 2 emoji are
   usable).

**Decisions made in the brainstorm**

| Topic | Decision |
|---|---|
| Fidelity | Recognizable but generative: shapes borrow a tradition's *structure* and stay parametric. Canonical fixed figures (e.g. a true Sri Yantra) may come later as presets. |
| Palette size | Palette length stays free. Each shape uses at most N emoji, **first N in palette order**. The UI shows which are in use. **Drag-to-reorder** chips. |
| Emoji assignment | Shapes give groups *roles/slots*; a shared assigner gives each group a symmetric repeating pattern. |
| Crowding | Per-shape slider ranges **plus** a fit rule (shrink, then re-space with fewer emoji) as a safety net. Shapes may opt into some overlap. |
| Picking a shape | Thumbnail strip of live previews (palette-coloured, shape defaults), like the background swatches. Shuffle also picks a random shape. |
| Switching shapes | Each shape remembers its own control values for the session; shared controls are global. |
| Backdrop | *(revised 2026-10-08)* Visible guide lines are **dropped**: no "Guide rings", and shapes draw no guides. Shapes still lay emoji out along their underlying geometry (rings, petals, triangles, grid); only the drawn lines go. The Backdrop select goes away; **"Soft glow"** becomes an on/off switch in the Background section. |
| Face outward | Shared. Every placement carries a `heading`; the renderer applies it. |
| Alternate | Shape-defined: each shape says whether it supports it, what it does, and what the toggle is called; hidden otherwise. |
| Build order | Engine → pattern/palette rules → spiral (+ strip, per-shape controls) → lotus → yantra → kolam. |

**Assumptions (not stated by the user):** the chosen shape and its settings
are not persisted across reloads (only background persists today);
export/share need no changes (they read the canvas); the app stays plain ES
modules with no build step.

**Accepted consequence:** with a prime symmetry that neither 2 nor 3
divides (5, 7, 11, 13, ...) every ring is a single emoji. That is
symmetric and calm; it is intended, not a bug.

## 2. Approaches considered

1. **Pure layout functions (chosen).** A shape is a pure function from
   parameters to `{ placements, groups }`. A shared renderer draws
   them; a shared assigner picks emoji. Small shared geometry helpers in
   `js/shapes/lib.js` so lotus/yantra reuse pieces.
   *Pros:* shapes are DOM-free and unit-testable in Node; thumbnails are the
   same code on a small canvas; the "no chaos" invariants live in one
   assigner, one fit helper, and one test sweep.
2. **Imperative shapes** that draw straight to the canvas. Every shape
   re-implements emoji choice, face-outward and fitting — exactly
   where chaos creeps in — and nothing is testable without a browser.
3. **Declarative recipes** composed from primitives, interpreted by an
   engine. Over-built for six shapes and awkward for phyllotaxis; approach
   1 gets most of the reuse via `lib.js` without the interpreter.

## 3. Architecture

### Files

```
js/shapes/index.js     registry: ordered SHAPES list, getShape(id)
js/shapes/lib.js       shared geometry: polar(), chord(), fitRing(), fitGap(),
                       polygonPoints(), petalCurve()
js/shapes/rings.js     Concentric rings (port of today's draw loop)
js/shapes/spiral.js    Phyllotaxis spiral
js/shapes/lotus.js     Lotus / rosette
js/shapes/yantra.js    Yantra
js/shapes/kolam.js     Kolam / rangoli lattice
js/pattern.js          assignEmoji(): groups + palette -> emoji per placement
js/draw.js             renderer: draw() for the main canvas, renderTo() for any canvas
js/shapeControls.js    shape thumbnail strip + per-shape control UI
js/palette.js          + drag-to-reorder, + "using K of your emoji" cue
js/backgrounds.js      backgrounds + soft glow; takes explicit options, not `state`
tests/*.test.mjs       node:test + node:assert, like tests/usage.test.mjs
```

`js/shapes/*` and `js/pattern.js` import nothing from `state.js`, `draw.js`
or the DOM; callers pass everything in (including the fallback palette).
Run tests with **`node --test`** from the repo root (Node 24 discovers
`tests/*.test.mjs`; `node --test tests/` does *not* work).

### Shape interface

```js
// js/shapes/rings.js
export default {
  id: "rings",
  label: "Concentric rings",
  controls: [                       // shape-specific sliders, in UI order
    { key: "rings",    label: "Rings",             min: 1,  max: 12,  step: 1, default: 6,
      shuffle: [3, 11] },
    { key: "symmetry", label: "Symmetry (spokes)", min: 3,  max: 24,  step: 1, default: 10,
      shuffle: [4, 21] },
    { key: "spacing",  label: "Ring spacing",      min: 50, max: 150, step: 1, default: 100,
      shuffle: [60, 149], format: v => (v/100).toFixed(1) + "×" },
  ],
  alternate: { label: "Alternate ring direction", default: true }, // or null
  maxEmoji: 6,                      // cap on distinct emoji for this shape (≤ 6)
  overlap: 0,                       // allowed overlap fraction, 0–0.5
  layout(params) { /* pure */ return { placements, groups }; },
};
```

`shuffle` is optional; Shuffle uses `[min, max]` when absent.

**`layout(params)` input** — one plain object:

| Field | Meaning |
|---|---|
| shape control keys | e.g. `rings`, `symmetry`, `spacing` |
| `alternate` | boolean (only meaningful if the shape declares `alternate`) |
| `centerMode` | `"emoji"` \| `"empty"` — each shape says in §5 what "empty" removes |
| `radius` | px; usable radius, today's `maxR = W/2 - emojiSize*0.9` |
| `emojiSize` | px; base glyph size |
| `minFont` | px; the renderer's font floor. From slice 2, every emitted `scale` is ≥ `minFont/emojiSize`, so the renderer's clamp never makes a glyph bigger than the fit assumed |

Coordinates are px relative to the canvas center, unrotated. Global
**rotation is applied by the renderer**, so shapes never handle it.

**Output:**

```js
placements: [{ x, y, heading, scale, group, index }]
//   heading: radians, the "outward" direction (used by Face outward),
//            or null = always upright (e.g. the center emoji)
//   scale:   multiplier on emojiSize; already includes any fit shrink
//   group:   index into groups[]
//   index:   position in the group's cycle, 0..size-1. Several placements
//            may share an index (e.g. both sides of a petal); they get the
//            same emoji.
groups: [{ size, kind, slot?, reverse?, ring? }]
//   size:    number of distinct indices actually emitted (after fitting);
//            a group fitted away to nothing is omitted, not size 0
//   kind:    "cycle" (repeating pattern) | "solid" (one emoji)
//   slot:    optional fixed palette slot (role), e.g. bindu -> 0
//   reverse: run the pattern the other way (used by Alternate)
//   ring:    rings shape only, for the slice-1 legacy assigner
```

(Slice 1's `rings.layout` also returns `guides`; slice 2 removes it.)

### Emoji assignment (`js/pattern.js`)

`assignEmoji(groups, palette, maxEmoji)` → `{ emojiFor(group, index), used }`.
`palette` is non-empty (the caller substitutes `DEFAULT_PALETTE`).

1. `use = palette.slice(0, min(maxEmoji, palette.length, 6))`, `U = use.length`.
2. Base slot of group `g`: **`base = (groups[g].slot ?? g) % U`** — `g` is
   the group's position in `groups[]`, whether or not other groups declare
   slots. (Rings with center: center is group 0 → slot 0, ring 1 is group 1
   → slot 1, so they always differ when U ≥ 2.)
3. Period `p`: `solid` → 1. `cycle` → the first of **2, 3** with `p ≤ U`
   and `size % p === 0`; otherwise 1.
4. Emoji at index `i`: `use[(base + k) % U]`, with
   `k = reverse ? (p - i % p) % p : i % p`. (For p = 2 reversing is a
   no-op; it is only visible for p = 3. Rings' Alternate stays visible
   through its half-step offset.)
5. `used` = the set of palette indices actually drawn (usually a prefix,
   but not always — e.g. a yantra with an empty center skips slot 0). The
   palette cue dims exactly the chips not in `used`.

Guarantees criteria 1, 3 and 4 by construction; unit-tested directly.

**Adjacency:** for groups without a declared `slot`, consecutive groups
differ whenever U ≥ 2. Shapes that declare slots must give consecutive
groups in `groups[]` (ordered inside-out) different slots, so they differ
whenever U ≥ `maxEmoji`.

A **legacy mode** `assignLegacy(groups, palette)` → `{ emojiFor, used }`
(same return shape, so it swaps in directly) exists only in slice 1 to
reproduce today's colouring exactly: center → `palette[0]`; ring group →
`palette[((ring*31) % len + index) % len]` over the whole palette, where
`index = s`, the emit order. Slice 2 deletes it.

### Fitting (`js/shapes/lib.js`)

The floor is `floor = max(MIN_SCALE, minFont/emojiSize)` with
`MIN_SCALE = 0.55`; base scales (e.g. rings' per-ring shrink) are clamped
to it too. "Need" for two placements of scale `a`, `b` is
`emojiSize · (a + b)/2 · (1 - overlap)`. The center emoji never shrinks
(scale 1.05); a group next to it uses need `emojiSize·(1.05 + a)/2·(1-overlap)`.
In the bullets below, `MIN_SCALE` means this `floor`.

- **`fitRing({ r, count, emojiPx, overlap })` → `{ count, scale }`** for an
  evenly spaced ring. Neighbour distance is the chord `2r·sin(π/count)`.
  `scale = min(1, chord / (emojiPx·(1-overlap)))`. If `scale < MIN_SCALE`:
  set `scale = MIN_SCALE` and `count` = the largest `m ≤ count` whose chord
  `2r·sin(π/m) ≥ MIN_SCALE·emojiPx·(1-overlap)`; the shape then places `m`
  positions **evenly re-spaced** around the ring (not a subset), so the
  ring stays symmetric for any `m`. If `m < 3` the group is dropped.
- **`fitGap({ gap, emojiPx, overlap })` → scale** — the same shrink for a
  radial gap between neighbouring groups (and between ring 1 and the center
  emoji). A group's final scale is `min(ringFit, gapFit to inner neighbour,
  gapFit to outer neighbour)`.
- When a radial gap is too small even at `MIN_SCALE`, each shape resolves it
  as described in §5 (rings push outward, spiral drops inner seeds, kolam
  shrinks the grid). Groups pushed past `radius` are dropped.

The sweep test in §7 checks the invariant over **all pairs** of placements,
so any shape-specific gap it misses fails a test.

### Renderer (`js/draw.js`)

`renderTo(ctx, W, opts)` draws on a **square** canvas of side `W` (all
canvases here are square), where `opts = { shape, params, palette,
background, glow, emojiSize, rotation, centerMode, faceOutward,
minFont }`. `opts.rotation` is in **degrees** (as in `state`) and is
converted to radians once, `rot = rotation·π/180`. `renderTo` returns
`{ used }` from the assigner, so the palette cue never recomputes it.

1. `ctx.clearRect(0, 0, W, W)`; `drawBackground(ctx, W, W, { background,
   glow, emojiSize })` → `dark` (fill, then the soft glow when `glow` is
   true). Image-background luminance is cached in a `WeakMap` keyed by the
   image element, since thumbnails redraw often. *Slice 1 only:* the
   options carry `backdrop` and `guideRings` instead of `glow`, so today's
   guide circles keep drawing; slice 2 deletes both.
2. `layout = shape.layout({...params, centerMode, radius, emojiSize, minFont})`.
3. `assignEmoji(...)` (slice 1: `assignLegacy(...)`).
4. Set `textAlign = "center"`, `textBaseline = "middle"`,
   `fillStyle = dark ? "#f2ecdd" : "#241c38"`. Draw placements **in array
   order** (center first, then rings in emit order). For each: font
   `max(minFont, emojiSize·scale) + "px 'Apple Color Emoji','Segoe UI
   Emoji','Noto Color Emoji',sans-serif"`; translate to `(x, y)` rotated by
   `rot`; if `faceOutward` and `heading !== null`, rotate the glyph by
   `heading + rot + π/2`; `fillText(emoji, 0, 0)`.

`draw()` keeps its signature and callers: it calls `renderTo` on the main
canvas with values from `state` and `minFont = 14`. `draw.js` keeps
exporting `canvas` and `ctx` (`export.js:1` imports `canvas`).

**Thumbnails** call `renderTo` on a tile canvas of width `W` with
`k = W / canvas.width`: `emojiSize = 44·k`, `minFont = 14·k`, `rotation 0`,
`faceOutward false`, `centerMode "emoji"`, the current `glow`, the shape's
default params, and the current palette and background.

### State

```js
state.shape = "rings";
state.shapeParams = { rings: { rings: 6, symmetry: 10, spacing: 100, alternate: true } };
// other shapes filled lazily from their control defaults on first visit
// global, unchanged: palette, rotation, emojiSize, centerMode, faceOutward,
//                    zoom, background
// from slice 2: glow (boolean, default true) replaces backdrop
```

`state.rings / symmetry / spacing / alternate` are removed; every reader
(`draw.js`, `backgrounds.js:141`, `main.js` slider bindings and Shuffle)
moves to `state.shapeParams.rings` in slice 1. `backdrop` keeps today's
values (`"none" | "soft" | "rings"`) in slice 1. Slice 2 replaces it with
`state.glow`: the Backdrop select is removed from `index.html`, and `glow`
is saved per device next to the background (`localStorage` key
`mandala.glow`), because it now sits in the Background section.

## 4. UI

- **Shape strip** — new "Shape" field at the top of the controls: ~72px
  canvas tiles (buttons, `aria-pressed`, `aria-label` = shape label),
  re-rendered when palette or background changes (≤ 6 tiles; cheap with the
  luminance cache). Wraps on phones; no horizontal page scroll.
- **Per-shape controls** — the Rings / Symmetry / Spacing sliders in
  `index.html` are replaced (slice 3) by a container that `shapeControls.js`
  fills from `shape.controls`, reusing today's slider markup and classes.
  Generated ids are `shape-<key>` / `shape-<key>-val` so they never clash
  with static ids. Emoji size, Rotation, Center, Face outward and
  Background stay static.
- **Alternate toggle** — label from `shape.alternate.label`; row hidden
  when the shape declares `null`.
- **Palette cue** — chips in `used` are normal, the rest dimmed; a caption
  reads "Concentric rings is using 4 of your 9 emoji — drag one forward to
  use it" (or "...using all 3 of your emoji"). Updates whenever `used`
  changes.
- **Drag-to-reorder** (Pointer Events, mouse and touch):
  - chips get `touch-action: none`, so touch drags don't scroll or
    `pointercancel`;
  - a drag starts only after ~6px of movement; **`setPointerCapture` is
    called only then**, so a tap on × still reaches the × button;
  - during the drag the chip moves visually (transform) and the drop slot
    is indicated; the palette array is reordered and
    `renderPaletteChips` re-run **only on `pointerup`** (it rebuilds the
    list with `innerHTML = ""`, which would destroy the dragged node);
  - keyboard: chips are focusable; with a chip focused, ←/→ move it, with
    `preventDefault()`.
- **Soft glow** — an on/off switch (default on) inside the Background
  section, using the same switch markup as the other toggles; the
  Backdrop select is removed.
- **Shuffle** — picks a random shape, then random values within each
  control's `shuffle` range (or full range), random Alternate if
  supported, plus today's global randomization (rotation, face outward,
  palette of 4–7). Updates the generated sliders.

## 5. Shapes

Ranges and defaults are starting points, tuned per slice by screenshot.
"Center" below is group 0 (`solid`, slot 0, scale 1.05, `heading: null`)
when `centerMode` is `"emoji"`, and absent when `"empty"`.

**Concentric rings** — today's geometry: ring `k` at radius
`k·ringSpacing`, `ringSpacing = (spacing/100)·(radius/rings)`, emitted in
order `s = 0..symmetry-1` at angle `dir·2πs/symmetry + rot`, where
`dir = -1` and `rot = π/symmetry` on even rings when Alternate is on, else
`dir = 1, rot = 0`. Placement `index = s` (emit order, not angular
order — with `dir = -1` they differ). Base scale `1 - (k-1)·0.03`
(clamped to the fit floor from slice 2). Heading = angle. Groups:
center, then one `cycle` group per ring (`reverse` on even rings when
Alternate is on). Fit (slice 2+): `fitRing` per ring, `fitGap` against
`ringSpacing` (and ring 1 against the center); if the radial gap fails at
`MIN_SCALE`, `ringSpacing` is raised to the minimum that fits and rings
beyond `radius` are dropped. From slice 2, `ringSpacing` is first
**clamped** so the outer ring sits within `radius`:
`ringSpacing = min((spacing/100)·(radius/rings), radius/rings)` (decided
2026-10-08; today spacing > 1.0× pushes outer rings off the canvas). The
slice 2 plan must decide what spacing > 1.0× then means, so the slider has
no dead range. "Empty" removes the center emoji. `maxEmoji` 6.

**Phyllotaxis spiral** — seed `i = 1..n`: angle `i·divergence`, radius
`R·√(i/n)`, heading = angle. Controls: Seeds 40–300 (default 144),
Divergence 137.0°–138.0° step 0.05 (default 137.5; the narrow range keeps
spacing even — wider values bunch seeds into spokes), Bands 1–5 (default 3).
Groups: center (if shown), then `bands` `solid` groups splitting the seeds
into **equal-count** runs by index (equal-area annuli). Fit: compute the
actual minimum nearest-neighbour distance (brute force, n ≤ 300) and
shrink to it; at `MIN_SCALE`, lower `n` until it fits. Seeds closer to the
center emoji than the need are dropped. Alternate: `null` in v1. "Empty"
removes the center emoji. `maxEmoji` 6.

**Lotus / rosette** — layers of petals around the center. Controls: Layers
1–4 (default 2), Petals 4–16 (default 8), Petal length 50–150 (default 100).
Each petal has a tip emoji and two side emoji. Per layer, two groups:
tips (`cycle`, size = petals, index = petal number) and sides (`cycle`,
size = petals, **both sides of petal j share index j**, so each petal is
mirror-symmetric). Alternate ("Interleave petal layers", default on): odd
layers offset by half a petal. Petal positions use `lib.petalCurve`.
"Empty" removes the center emoji. `maxEmoji` 6, `overlap` 0.15.

**Yantra** — inside out, with fixed role slots:
- bindu (center, slot 0);
- hexagrams (slot 1): Triangles control 1–3 nested up/down triangle pairs.
  Each hexagram places emoji on its 6 star tips plus `detail` evenly spaced
  points on each of its 12 outer edges (tip → crossing), all in one `cycle`
  group of size 6 indexed by star arm — so with p = 2 the up and down
  triangles take different emoji. Its 6 crossing points form a second
  group (slot 2, size 6). Nothing is placed on the inner hexagon's sides,
  which keeps every point clear of the crossings. Nested pairs **swap
  slots** (odd pairs: star slot 2, crossings slot 1) so adjacent pairs
  differ even with p = 2. Fit: edge points are spaced `segLen/(detail+1)`;
  if that is under the need at the floor, lower `detail` (to 0) for that
  hexagram, then drop inner hexagrams that still don't fit;
- one lotus layer (slot 3) via `lib.petalCurve`, tips only;
- bhupura square (slot 4, `solid`): emoji on the corners and evenly along
  each side, the same count per side, skipping the gate opening;
- four T-gates (slot 5, `solid`) at the side midpoints.

Controls: Triangles 1–3 (default 1), Petals 8–16 step 4 (default 8), Edge
detail 0–3 (default 1). Alternate ("Interleave petals"): petals offset by
half a petal. "Empty" removes the bindu emoji. `maxEmoji` 6.

**Kolam / rangoli lattice** — square grid of `g × g` dots (Grid 3–11 odd,
default 7), `kmax = (g-1)/2`, cell `s = radius/(kmax·√2) · spacing/100`
with Spacing 50–100 (default 90), so corners at `√2·kmax·s` always stay
inside `radius`. Emoji on the dots. Groups: center dot, then one `cycle`
group per square ring `k = 1..kmax` (8k dots). Alternate ("Alternate dot
rings"): odd rings `reverse`. Fit: neighbour distance is `s`; at
`MIN_SCALE`, reduce `g` by 2 until it fits. "Empty" removes the center
dot's emoji. `maxEmoji` 4.

## 6. Slices

Each slice gets its own plan, is implemented on its own branch by
subagents, screenshot-verified by me before merge, and ticked off in
`ROADMAP.md`.

1. **Engine (no visible change).** `js/shapes/index.js`, `lib.js` (`polar`
   only), `rings.js` (today's geometry, no fitting), `pattern.js` with
   `assignLegacy` only, `renderTo`/`draw` refactor, `backgrounds.js` taking
   explicit options (plus `guideRings`, see Renderer step 1). State moves
   to `state.shapeParams.rings`, including **`backgrounds.js:141`** (guide
   circles stay there, unchanged, until slice 2) and
   **`main.js:93-94, 97, 108-110, 119-135`** (slider bindings, the
   Alternate listener, Shuffle). `bindRange` writes `state[key]`, so it
   needs a variant that writes `state.shapeParams.rings[key]`. Center
   emoji `heading: null`. `index.html` is untouched (Backdrop value stays
   `"rings"`). Done when screenshots match a pre-refactor baseline at
   ≥ 4 combinations (incl. Alternate on/off, Face outward on, rotation ≠ 0,
   a 3-emoji palette): fewer than 0.5% of pixels differ by more than
   8/255.
2. **Pattern and palette rules.** Real `assignEmoji`, `fitRing`/`fitGap`,
   rings uses them; `assignLegacy` deleted; guide rings and the Backdrop
   select removed, Soft glow becomes a switch in the Background section
   (`state.glow`, `guideRings` and `layout.guides` deleted); `renderTo`
   returns `used`; palette cue; drag-to-reorder. Visible change: rings
   become seam-free and never overlap. The sweep test regains "every
   placement within `radius + emojiSize`" (possible once spacing is
   clamped).
3. **Phyllotaxis spiral + shape strip + generated per-shape controls +
   Shuffle picks a shape.**
4. **Lotus / rosette** (adds `petalCurve`, `polygonPoints`).
5. **Yantra.**
6. **Kolam / rangoli lattice.**

## 7. Testing

- **Unit (`node --test`)**, `node:test` + `node:assert`, no dependencies:
  - `pattern`: only `use` emoji appear; in a `cycle` group
    `emoji(i) === emoji(i + p)` and `size % p === 0`; adjacency as stated
    in §3 (slot-less groups when U ≥ 2, slotted groups when U ≥ maxEmoji); `reverse` reverses for p = 3; `used` lists exactly the indices drawn;
    U = 1 and size = 1 work; deterministic.
  - `fitRing` / `fitGap`: shrink, then even re-spacing; drop below 3.
  - **Sweep every shape** over a grid of its control ranges × centerMode ×
    alternate × emojiSize {20, 44, 80}: no NaN; every placement within
    `radius + emojiSize`; each group's `size` matches the distinct indices
    emitted and they cover `0..size-1`; and, **from slice 2** (slice 1's
    port deliberately keeps today's overlaps), **for every pair of
    placements** distance ≥ `0.95 · emojiSize · (a+b)/2 · (1-overlap)`
    and every `scale ≥ minFont/emojiSize`.
- **Browser** via `~/.tools/playwright` scripts: no console errors;
  screenshots of each shape at defaults and slider extremes, desktop and
  phone width; drag-to-reorder by mouse and by touch emulation; I look at
  every screenshot myself. Slice 1 adds a pixel-diff script against a
  baseline captured before the refactor.

## 8. Out of scope

Persisting the chosen shape/settings; canonical fixed-figure presets;
per-placement colour or glyph effects; animation; user-defined shapes;
changes to export/share; PDF export (roadmap item 3).
