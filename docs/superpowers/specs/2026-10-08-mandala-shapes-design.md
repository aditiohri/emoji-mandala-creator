# Customizable mandala shapes — design

Status: draft for review (2026-10-08). Tracker: `ROADMAP.md` item 1.

## 1. Intent

**Outcome.** People choose among several mandala shapes — concentric rings
(today), phyllotaxis spiral, lotus/rosette, yantra, kolam/rangoli lattice —
instead of only today's hardcoded rings.

**Success criterion (the user's words):** *"a visible, distinct, elegant
pattern every time, no matter what the user does."* Concretely, for every
shape and every combination of palette and control values:

1. Every group (ring, petal layer, band, ...) is rotationally symmetric —
   no seam where an emoji cycle wraps unevenly.
2. Emoji never pile on top of each other beyond what the shape deliberately
   allows.
3. At most N distinct emoji appear, where N is set by the shape, taken from
   the front of the palette.
4. Adjacent groups look different from each other (when N ≥ 2).

**Decisions made in the brainstorm**

| Topic | Decision |
|---|---|
| Fidelity | Recognizable but generative: shapes borrow a tradition's *structure* and stay parametric. Canonical fixed figures (e.g. a true Sri Yantra) may come later as presets. |
| Palette size | Palette length stays free. Each shape uses at most N emoji, **first N in palette order**. The UI shows which N are in use. **Drag-to-reorder** chips. |
| Emoji assignment | Shapes give groups *roles/slots*; a shared assigner gives each group a symmetric repeating pattern from those N emoji. |
| Crowding | Per-shape slider ranges **plus** a fit rule (shrink, then symmetric thinning) as a safety net. Shapes may opt into some overlap. |
| Picking a shape | Thumbnail strip of live previews (palette-coloured, shape defaults), like the background swatches. Shuffle also picks a random shape. |
| Switching shapes | Each shape remembers its own control values for the session; shared controls are global. |
| Guides | Backdrop "Guide rings" becomes **"Guides"**: the current shape draws its own guide lines. "Soft glow" and "None" stay global. |
| Face outward | Shared. Every placement carries a `heading`; the renderer applies it. |
| Alternate | Shape-defined: each shape says whether it supports it, what it does, and what the toggle is called; hidden otherwise. |
| Build order | Engine → pattern/palette rules → spiral (+ strip, per-shape controls) → lotus → yantra → kolam. |

**Assumptions (not stated by the user; correct me in review):**
the chosen shape and its settings are not persisted across reloads (only
background persists today); export/share need no changes (they read the
canvas); the app stays plain ES modules with no build step.

## 2. Approaches considered

1. **Pure layout functions (chosen).** A shape is a pure function from
   parameters to `{ placements, groups, guides }`. A shared renderer draws
   them; a shared assigner picks emoji. Small shared geometry helpers in
   `js/shapes/lib.js` (polar points, polygon edges, petal curves, fit rule)
   so lotus/yantra reuse pieces.
   *Pros:* shapes are DOM-free and unit-testable in Node; thumbnails are the
   same code on a small canvas; the "no chaos" invariants are enforced in one
   place (assigner + fit helper), not re-implemented per shape.
2. **Imperative shapes** that draw straight to the canvas. Less ceremony per
   shape, but every shape re-implements emoji choice, face-outward, guides
   and fitting — exactly where chaos creeps in — and nothing is testable
   without a browser.
3. **Declarative recipes** composed from primitives (`ring`, `polygon`,
   `petals`, `grid`) interpreted by an engine. Elegant for yantra-like
   composites, but a mini-language is over-built for six shapes and
   awkward for phyllotaxis. Approach 1 gets most of the reuse via `lib.js`
   helpers without the interpreter.

## 3. Architecture

### Files

```
js/shapes/index.js     registry: ordered SHAPES list, getShape(id)
js/shapes/lib.js       shared geometry: polar(), polygonPoints(), petalCurve(),
                       fitGroup(), symmetricThinStep(), divisors()
js/shapes/rings.js     Concentric rings (port of today's draw loop)
js/shapes/spiral.js    Phyllotaxis spiral
js/shapes/lotus.js     Lotus / rosette
js/shapes/yantra.js    Yantra
js/shapes/kolam.js     Kolam / rangoli lattice
js/pattern.js          assignEmoji(): groups + palette -> emoji per placement
js/draw.js             renderer: background -> layout -> guides -> emoji
js/shapeControls.js    shape thumbnail strip + per-shape control UI
js/palette.js          + drag-to-reorder, + "uses N of your emoji" cue
js/backgrounds.js      backgrounds + soft glow only (circle guides move out)
tests/*.test.mjs       node:test unit tests for shapes, lib, pattern
```

`js/shapes/*`, `js/pattern.js` must not touch the DOM, `state`, or
`canvas`, so `node --test tests/` runs with no browser and no dependencies.

### Shape interface

```js
// js/shapes/rings.js
export default {
  id: "rings",
  label: "Concentric rings",
  controls: [                       // shape-specific sliders, in UI order
    { key: "rings",    label: "Rings",    min: 1,  max: 12,  step: 1, default: 6 },
    { key: "symmetry", label: "Symmetry", min: 3,  max: 24,  step: 1, default: 10 },
    { key: "spacing",  label: "Spacing",  min: 50, max: 150, step: 1, default: 100,
      format: v => (v/100).toFixed(1) + "×" },
  ],
  alternate: { label: "Alternate ring direction", default: true }, // or null
  maxEmoji: params => Math.min(6, params.rings + 2), // N at these params (see §5)
  overlap: 0,                       // allowed overlap fraction for fitGroup (0–0.5)
  layout(params) { /* pure */ return { placements, groups, guides }; },
};
```

**`layout(params)` input** — one plain object:

| Field | Meaning |
|---|---|
| shape control keys | e.g. `rings`, `symmetry`, `spacing` |
| `alternate` | boolean (only meaningful if the shape declares `alternate`) |
| `centerMode` | `"emoji"` \| `"empty"` — the shape emits (or not) a center placement |
| `radius` | px; usable radius, today's `maxR = W/2 - emojiSize*0.9` |
| `emojiSize` | px; base glyph size |

Coordinates are px relative to the canvas center, unrotated. Global
**rotation is applied by the renderer** to positions, headings and guides,
so shapes never handle it.

**Output:**

```js
placements: [{ x, y, heading, scale, group, index }]
//   heading: radians, the "outward" direction at this point (used by Face outward)
//   scale:   multiplier on emojiSize (renderer font = max(14, emojiSize*scale))
//   group:   index into groups[]
//   index:   position within the group's cycle, 0..size-1
groups: [{ size, kind, slot?, reverse? }]
//   size:    number of positions in the cycle (after thinning)
//   kind:    "cycle" (repeating pattern around the group) | "solid" (one emoji)
//   slot:    optional fixed palette slot (role), e.g. bindu -> 0, gates -> 4
//   reverse: run the pattern the other way (used by Alternate)
guides: [{ type: "circle", r } | { type: "path", points: [[x,y],...], closed }]
//   curves (petals, kolam loops) are pre-sampled into polylines
```

### Emoji assignment (`js/pattern.js`)

`assignEmoji(groups, palette, N)` returns `(group, index) => emoji`.

1. `use = palette.slice(0, min(N, palette.length, MAX_EMOJI=6))`; empty
   palette falls back to `DEFAULT_PALETTE`. `U = use.length`.
2. Each group gets a base slot: its declared `slot` if any (mod `U`), else
   the next slot in a cycle over groups in order. With the rings shape and
   center shown, the center is slot 0 and rings take 1, 2, ..., wrapping.
3. Period `p`: `solid` → 1. `cycle` → the first of **2, 3** with
   `p ≤ U` and `size % p === 0`; otherwise 1. (A-B alternation preferred
   over A-B-C; an odd-sized ring that 3 doesn't divide becomes solid rather
   than seamed.)
4. Emoji at `index i` = `use[(base + k) % U]` where
   `k = (reverse ? (p - i % p) % p : i % p)`.

This guarantees criteria 1, 3 and 4 by construction. Unit-test it directly.

### Fit rule (`lib.fitGroup`)

Shapes call `fitGroup({ size, neighborDist, emojiPx, overlap })` for every
group whose neighbours are evenly spaced. It returns `{ scale, step }`:

- `need = emojiPx * (1 - overlap)`. If `neighborDist ≥ need`: `scale` 1, `step` 1.
- Else shrink: `scale = neighborDist / emojiPx`, down to a floor of 0.55.
- If still too crowded at the floor, thin: `step` = the smallest divisor
  `d > 1` of `size` with `neighborDist * d ≥ need` at the floor scale; the
  shape keeps every `step`-th position, so the group stays symmetric with
  `size / step` positions. If no divisor works, `step = size` (one emoji).

The shape reports the thinned `size` in `groups[]`, so pattern assignment
runs on what is actually drawn. Shapes with irregular spacing (spiral) use
their own equivalent rule built on the same floor.

### Renderer (`js/draw.js`)

`draw()` keeps its signature and callers. Internally:
`drawBackground` (fill + soft glow) → `shape.layout(params)` → if backdrop
is `"guides"`, stroke `guides` in today's faint style
(`rgba(…,0.06)`, 1px) → `assignEmoji` → for each placement: rotate
position/heading by `state.rotation`, set font from `scale`, rotate glyph by
`heading + π/2` only when Face outward is on, `fillText`.

`renderTo(ctx, W, shapeId, params, palette, background)` is the same
pipeline at an arbitrary size, used by thumbnails (emojiSize scaled by
`W / canvas.width`).

### State

```js
state.shape = "rings";
state.shapeParams = { rings: { rings: 6, symmetry: 10, spacing: 100, alternate: true } };
// filled lazily from each shape's control defaults on first visit
// global, unchanged: palette, rotation, emojiSize, centerMode, faceOutward,
//                    backdrop ("none" | "soft" | "guides"), zoom, background
```

`state.rings / symmetry / spacing / alternate` move into
`state.shapeParams.rings`.

## 4. UI

- **Shape strip** — new "Shape" field at the top of the controls: a row
  of ~72px canvas tiles (buttons, `aria-pressed`, `aria-label` = shape
  label), rendered with the current palette and background at each shape's
  *default* params. Re-rendered when palette or background changes. Wraps
  on phones; no horizontal page scroll.
- **Per-shape controls** — the Rings / Symmetry / Spacing sliders in
  `index.html` are replaced by a container that `shapeControls.js` fills
  from `shape.controls` (same markup and classes as today's sliders).
  Emoji size, Rotation, Center, Face outward, Background, Backdrop stay
  static.
- **Alternate toggle** — label taken from `shape.alternate.label`; row
  hidden when the shape declares `null`.
- **Palette cue** — chips beyond N are dimmed, separated by a thin divider,
  with a caption like "Yantra uses your first 5 emoji — drag to reorder".
  Updates when the shape or its params change N.
- **Drag-to-reorder** — Pointer Events (works for mouse and touch; HTML5
  drag-and-drop doesn't work on touch). Long-press is not required; drag
  starts after ~6px movement so taps on × still work. Keyboard: chips are
  focusable, Alt+←/→ moves the focused chip.
- **Backdrop select** — options: None / Soft glow / Guides.
- **Shuffle** — picks a random shape, then random values within that
  shape's control ranges (and random Alternate if supported), plus today's
  global randomization (rotation, face outward, palette).

## 5. Shapes

Ranges and defaults below are starting points; each slice tunes them by
screenshot.

**Concentric rings** — today's geometry. Groups: center (slot 0, solid)
and one `cycle` group per ring of `symmetry` items. Alternate: even rings
offset by π/symmetry and `reverse`. Guides: a circle at each ring's actual
radius (fixes today's guides ignoring Spacing). N = min(6, number of
groups + 1), so the "uses your first N" cue never promises emoji that can't
appear.

**Phyllotaxis spiral** — seed `i`: angle `i·divergence`, radius
`R·√(i/n)`, heading = angle. Controls: Seeds 40–300 (default 144),
Divergence 136.0°–139.0° step 0.1 (default 137.5; small departures give
spokes, still orderly), Bands 1–6 (default 4). Colouring: seeds are split
into `bands` concentric annuli by radius, each a `solid` group — seam-free
by construction, while the spiral arms come from the geometry. N = bands.
Fit: neighbour spacing ≈ `R·√(π/n)`; shrink to the floor, then reduce the
effective seed count. Alternate: `null` in v1. Guides: the two dominant
parastichy families as sampled spiral polylines (Fibonacci counts nearest
the seed count). Center seed doubles as the center emoji when Center =
emoji.

**Lotus / rosette** — layers of petals around a center. Controls: Layers
1–4 (default 2), Petals 4–16 (default 8), Petal length 50–150 (default 100).
Each petal carries a tip emoji and a pair along its sides; groups per layer:
tips (`cycle`, size = petals), sides (`cycle`, size = 2·petals). Alternate
("Interleave petal layers", default on): odd layers offset by half a petal.
Guides: petal outlines (sampled curves). N = layers + 2. `overlap` 0.15.

**Yantra** — inside out: bindu (slot 0), interlocking up/down triangles
with emoji along edges (slot 1), one lotus layer (slot 2, reuses
`lib.petalCurve`), square bhupura with emoji along its perimeter (slot 3)
and four T-gates (slot 4). Controls: Triangles 1–3 nested pairs (default 1),
Petals 8–16 step 4 (default 8), Edge detail 2–6 emoji per edge (default 3).
Square and gates are fixed 4-fold. Alternate ("Interleave petals"). Guides:
triangles, petal outlines, square with gates. N = 5.

**Kolam / rangoli lattice** — odd grid of dots (Grid 3–11 step 2,
default 7; Spacing 50–150), emoji on dots. Groups: square rings of dots
around the center (Chebyshev distance k → 8k dots, `cycle`), center dot
slot 0. Alternate ("Alternate dot rings"): odd rings `reverse`. Guides: the
dot grid plus diagonal lattice lines through the dots. N = 4.

## 6. Slices

Each slice is one branch, implemented by a Haiku subagent from a written
plan, reviewed and screenshot-verified by me before merge, and ticked off
in `ROADMAP.md`.

1. **Engine (no visible change).** `js/shapes/index.js`, `lib.js` (polar
   only), `rings.js`, `pattern.js` in a *legacy* mode reproducing today's
   `palette[((ring*31) % len + s) % len]` rule (center = `palette[0]`, all
palette emoji used), renderer refactor, state
   move into `shapeParams.rings`, `node --test` scaffold. Backdrop circles
   stay in `backgrounds.js` for now. Done when screenshots match pre-refactor
   at ≥4 control/palette combinations (pixel diff: fewer than 0.5% of
   pixels differ by more than 8/255 — float order may shift sub-pixel
   antialiasing).
2. **Pattern and palette rules.** Real `assignEmoji`, `fitGroup`, rings
   uses them; shape guides replace backdrop circles ("Guides" option);
   N cue; drag-to-reorder. Visible change: rings become seam-free.
3. **Phyllotaxis spiral + shape strip + per-shape controls + Shuffle
   picks a shape.** First non-ring shape proves the interface.
4. **Lotus / rosette** (adds `petalCurve`, `polygonPoints`).
5. **Yantra.**
6. **Kolam / rangoli lattice.**

## 7. Testing

- **Unit (`node --test tests/`)**, no dependencies:
  - `pattern`: only the first N emoji used; in a `cycle` group,
    `emoji(i) === emoji(i + p)` and `size % p === 0`; adjacent groups
    differ when U ≥ 2; `reverse` reverses; deterministic.
  - `fitGroup`: shrink then thin; returned `step` divides `size`.
  - Every shape, swept over a grid of its control ranges × centerMode ×
    alternate: no NaN, every placement within `radius + emojiSize`,
    `groups[g].size` equals the number of placements in group g with
    `index` covering `0..size-1`, and no two placements closer than
    `emojiPx * scale * (1 - overlap) * 0.95` (spiral: same check with its
    own rule).
- **Browser** via `~/.tools/playwright` scripts: no console errors;
  screenshot each shape at defaults and at slider extremes, desktop and
  phone width; I look at every screenshot myself. Slice 1 adds a pixel-diff
  script against a pre-refactor baseline.

## 8. Out of scope

Persisting the chosen shape/settings; canonical fixed-figure presets;
per-placement colour or glyph effects; animation; user-defined shapes;
changes to export/share; PDF export (roadmap item 3).
