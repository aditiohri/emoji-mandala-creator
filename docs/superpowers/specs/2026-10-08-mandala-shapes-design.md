# Customizable mandala shapes — design

Status: approved (2026-10-08), revised after two reviews; toggles decided 2026-10-08 (§1, §4); lotus decided 2026-10-08 (§1 "Lotus", §5); yantra decided 2026-10-08 (§1 "Yantra", §5). Tracker: `ROADMAP.md` item 1.
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
| Crowding | Per-shape slider ranges **plus** a fit rule (shrink, then remove elements, keeping the structure — see "Crowded groups") as a safety net. Shapes may opt into some overlap. |
| Picking a shape | Thumbnail strip of live previews (palette-coloured, shape defaults), like the background swatches. Shuffle also picks a random shape. |
| Switching shapes | Each shape remembers its own control values for the session; shared controls are global. |
| Backdrop | *(revised 2026-10-08)* Visible guide lines are **dropped**: no "Guide rings", and shapes draw no guides. Shapes still lay emoji out along their underlying geometry (rings, petals, triangles, grid); only the drawn lines go. The Backdrop select goes away; **"Soft glow"** becomes an on/off switch in the Background section. |
| Face outward | Shared. Every placement carries a `heading`; the renderer applies it: the glyph's top points away from the center. *(Toggles decision, 2026-10-08)* Kept as is: once colouring is symmetric (slice 2), directional emoji (🦋🌊🔥🌙) form a clear starburst at defaults. Round emoji (✨🌸💠) show little change, and that is accepted. |
| Alternate | Shape-defined: each shape says whether it supports it, what it does, and what the toggle is called; hidden otherwise. *(Toggles decision, 2026-10-08)* For rings, the visible effect is the half-step offset of every other ring (straight spokes → staggered lattice); the direction reversal never shows for rings: even rings are emitted in reverse angular order and also marked `reverse`, and the two cancel (found in the slice 2 final review; harmless, kept). Shapes that emit forward and use `reverse` (kolam) do show it with p = 3; the lotus's Alternate is a half-petal offset instead (§5). So rings keep the behaviour but the switch is renamed **"Stagger alternate rings"**; the state key stays `alternate`. Options judged by screenshot and rejected: a progressive twist (spiral arms; overlaps the spiral shape) and swapping colours on alternate rings (hard to tell from off). |
| Toggle switches | *(2026-10-08)* Every switch must toggle when its **visible pill** is clicked with a mouse or tapped, not only via its text label. Today's `<div class="switch">` around a 0×0 checkbox fails this; switches become `<label class="switch">`. Verified with real Playwright locator clicks on the pill, never JS `checked =`/`click()`. |
| Soft glow | *(2026-10-08, slice 2 final review)* Glow inner stop raised to 0.22 (light) / 0.30 (dark) alpha so the switch reads at a glance at defaults; 0.10 / 0.16 was barely visible. |
| Crowded groups | *(2026-10-08, slice 3 design, chosen from screenshots of four options)* **When crowded, remove elements and keep the structure; never jump to an unrelated count.** Rings: a ring that can't hold its full `symmetry` at the floor scale is **dropped**, not re-spaced with fewer emoji, so the crowded core becomes an open halo around the center emoji instead of a scatter of unrelated counts (8, 15, 21 around 24 spokes). Rejected: snapping to a divisor of symmetry (still busy for odd symmetry), halving, keeping slice 2's behaviour. Spiral: lower the seed count, and drop the seeds that would hit the center emoji. Later shapes follow the same rule (fewer petals/detail/grid dots, never an irregular layout). |
| Phone chip drag | *(2026-10-08, slice 3 design)* Chips use `touch-action: pan-y`: a vertical swipe that starts on a chip scrolls the page (with `none` it was blocked); a drag that starts sideways reorders, and may then move in any direction, including across rows. Press-and-hold was rejected as more code and more iOS-specific risk. |
| Lotus | *(2026-10-08, slice 4 design, chosen from screenshot grids)* Petals are **outlined**: a tip emoji plus emoji spaced about one emoji apart along both sides of a pointed-arch outline (open base, widest a third of the way up), not the 3 emoji per petal first written here, which read as scattered dots. Layers fill the space from the center emoji to `radius` with **outer bands wider**, leaving no gaps. The slider is **"Petal width"** (how much of the room to the neighbouring petal a petal takes), not "Petal length". **Layers 1–3**: at 4, layers tangle into one mass. Crowding: the petal count never changes; a petal too narrow for two sides becomes a **spoke** (emoji down its axis). Rejected: dropping layers whose petals are thin (it emptied the canvas at emoji size 80), fewer petals. `polygonPoints` waits for yantra (slice 5). |
| Yantra | *(2026-10-08, slice 5 design, chosen from screenshot grids)* The §5 text first written here did not survive prototyping, and is rewritten. **Lotus layer: outlined petals** (the Lotus shape's outline), not tips only, which read as scattered dots; a petal is an outline or a spoke, **whichever keeps more emoji** (the Lotus shape's widest-point test alone left 16 narrow petals as a tip plus one side pair, a ring of dots at their bases). **Hexagram: two full triangle lines** with the six crossings as "knots"; leaving the inner hexagon's sides empty showed six clumps, not two triangles. Lines crossing at 60° keep their neighbours one step apart, so full lines never overlap. **Lines at 0.65× the emoji size** (the bindu stays 1.05): at full size the lines were sparse dots and nested stars clumped. **Nested stars turn 30°** each level, tips pointing at the outer star's knots, at the floor scale; the star grows as Triangles rises. **Gates: classic T outline** (opening, narrow neck, wider head) on the square's lattice. Rejected: a T of stem and bar, a gateway of posts and lintel, no gates. **Edge detail is removed**: with full lines the density is set by fit, so the slider had nothing to do; no third control replaces it. Alternate is **"Offset petals"** (half a petal, default off). |
| Build order | Engine → pattern/palette rules → spiral (+ strip, per-shape controls) → lotus → yantra → kolam. |

**Assumptions (not stated by the user):** the chosen shape and its settings
are not persisted across reloads (only background persists today);
export/share need no changes (they read the canvas); the app stays plain ES
modules with no build step.

**Accepted consequence:** with a prime symmetry that neither 2 nor 3
divides (5, 7, 11, 13, ...) every ring is a single emoji. That is
symmetric and calm; it is intended, not a bug.

**Accepted consequence (2026-10-08):** because crowded rings are dropped
(§1 "Crowded groups"), large emoji with high symmetry leave an open center
(about a third of the canvas at size 80, symmetry 24), and at extremes few
rings remain (rings 4 → 1 at spacing 0.5×, symmetry 23, size 80, empty
center). At least one ring is always drawn (checked over every slider value).

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
                       petalCurve() (slice 4), polygonPoints(), petalOutline(),
                       petalSpoke() (slice 5; the last two moved from lotus.js)
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
  alternate: { label: "Stagger alternate rings", default: true }, // or null
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
//   ring:    slice 1 only (legacy assigner); removed in slice 2
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
   no-op; it is only visible for p = 3, and for rings not at all, because
   their reversed emit order cancels it. Rings' Alternate is visible
   through its half-step offset.)
5. `used` = the set of palette indices actually drawn (usually a prefix,
   but not always — e.g. U = 2 with only solid groups in slots 1 and 3). The
   palette cue dims exactly the chips not in `used`.

Guarantees criteria 1, 3 and 4 by construction; unit-tested directly.

**Adjacency:** for groups without a declared `slot`, consecutive groups
differ whenever U ≥ 2. "Differ" means a different base emoji: with U = 2,
two period-2 rings share both emoji, out of phase. Shapes that declare slots must give consecutive
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

`lib.js` exports `MIN_SCALE`, `fitFloor(emojiSize, minFont)` (the floor
above), `chord(r, count)`, `fitRing` and `fitGap`; both fit helpers take the
`floor` explicitly.

- **`fitRing({ r, count, emojiPx, overlap, floor })` → `{ count, scale }`** for an
  evenly spaced ring. Neighbour distance is the chord `2r·sin(π/count)`.
  `scale = min(1, chord / (emojiPx·(1-overlap)))`. If `scale < MIN_SCALE`:
  set `scale = MIN_SCALE` and `count` = the largest `m ≤ count` whose chord
  `2r·sin(π/m) ≥ MIN_SCALE·emojiPx·(1-overlap)`; the shape then places `m`
  positions **evenly re-spaced** around the ring (not a subset), so the
  ring stays symmetric for any `m`. If `m < 3`, `count` is 0 and the group is
  dropped. *(From slice 3)* Rings no longer use the re-spaced count: a ring with
  `m < symmetry` is dropped (§1 "Crowded groups"). The helper keeps its
  contract for later shapes, which still follow the same rule.
- **`fitGap({ gap, emojiPx, overlap, other?, floor })` → scale** — the same
  shrink for a radial gap between neighbouring groups: the largest `s ≤ 1`
  with `emojiPx·(s + other)/2·(1-overlap) ≤ gap`, where `other` is the
  neighbour's scale (omitted = the same `s`; the center passes 1.05).
  Clamped to `≥ floor`; the caller moves groups apart when the gap fails even
  at the floor. A group's final scale is `min(ringFit, gapFit to inner neighbour,
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

- **Shape strip** — new "Shape" field *(placement decided in the slice 3
  plan review: after Quick add and View zoom, directly above the generated
  sliders, so the palette stays first)*: ~72px
  canvas tiles (buttons, `aria-pressed`, `aria-label` = shape label),
  re-rendered when palette or background changes (≤ 6 tiles; cheap with the
  luminance cache; slice 3 simply redraws them on every draw. Measured in
  slice 4 with three tiles: about 1 ms per redraw; slice 5 with four: about 2.7 ms in all, so this stays). Wraps on phones; no horizontal page scroll.
- **Per-shape controls** — the Rings / Symmetry / Spacing sliders in
  `index.html` are replaced (slice 3) by a container that `shapeControls.js`
  fills from `shape.controls`, reusing today's slider markup and classes.
  Generated ids are `shape-<key>` / `shape-<key>-val` so they never clash
  with static ids. Emoji size, Rotation, Center, Face outward and
  Background stay static.
- **Toggle switches** — each is a `<label class="switch">` wrapping its
  checkbox and pill, so clicking the visible pill toggles it (see §1). The
  text label keeps working too.
- **Alternate toggle** — label from `shape.alternate.label`; row hidden
  when the shape declares `null`. Slice 2 renames the static label to
  "Stagger alternate rings"; slice 3 makes it come from the shape.
- **Palette cue** — chips in `used` are normal, the rest dimmed; a caption
  reads "Concentric rings is using 4 of your 9 emoji — drag one forward to
  use it" (or "...using all 3 of your emoji"). Updates whenever `used`
  changes.
- **Drag-to-reorder** (Pointer Events, mouse and touch):
  - *(slice 3)* chips get `touch-action: pan-y` (§1 "Phone chip drag"):
    vertical swipes scroll the page, sideways-starting drags reorder.
    Slice 2 used `touch-action: none`;
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

**Concentric rings** *(rewritten 2026-10-08 to match the slice 2 code,
`js/shapes/rings.js`)*. With `f = spacing/100`:

1. Radial step `step = min(f, 2 - f)·radius/rings`, then raised to at least
   `emojiSize·floor·(1-overlap)` so rings are never closer than an emoji at
   the floor scale. `gapCap = fitGap({ gap: step })` caps every ring's scale.
2. Inner offset `inner = f > 1 ? max(0, radius - rings·step) : 0`. So 1.0×
   spreads rings evenly to the edge, below 1.0× packs them toward the
   center, above 1.0× packs them toward the **edge** (outer ring on
   `radius`, open center). The slider has no dead range at roomy settings;
   when rings are crowded at the floor scale, spacing has no room left to
   act, and that is accepted.
3. Ring 1 vs the center emoji (only when shown): shrink ring 1 first,
   `s1 = min(gapCap, fitGap({ gap: inner + step, other: 1.05 }))`, then push
   every ring out by the remaining shortfall,
   `inner = max(inner, emojiSize·(1.05 + s1)/2·(1-overlap) - step)`.
4. Ring `k = 1..rings` sits at `r = inner + k·step`; the loop stops at the
   first ring with `r > radius`. Base scale `max(floor, 1 - (k-1)·0.03)`;
   cap `min(base, gapCap, k = 1 ? s1 : 1)`.
5. `fitRing({ r, count: symmetry })` gives the ring's fitted count and
   scale. *(From slice 3, §1 "Crowded groups")* if the fitted count is
   below `symmetry` the ring is **dropped**, so every drawn ring has
   `n = symmetry`. (Slice 2 kept it, evenly re-spaced with fewer emoji.)
   Final scale `min(cap, fit.scale)`.
6. Emit `s = 0..n-1` at `angle = dir·2πs/n + offset`: on even rings with Alternate on, `dir = -1` and
   `offset = π/n`; otherwise `dir = 1`, `offset = 0` (Alternate is labelled
   "Stagger alternate rings", §1). Placement `index = s` (emit order, not
   angular order). Heading = angle.

Groups: center, then one `{ size: n, kind: "cycle", reverse }` per ring,
`reverse` on even rings with Alternate on (it cancels against the reversed
emit order, §1). "Empty" removes the center emoji. `maxEmoji` 6.

**Phyllotaxis spiral** — seed `i = 1..n`: angle `i·divergence`, radius
`R·√(i/n)`, heading = angle. Controls: Seeds 40–300 (default 144),
Divergence 137.0°–138.0° step 0.05 (default 137.5; the narrow range keeps
spacing even — wider values bunch seeds into spokes), Bands 1–5 (default 3).
Groups: center (if shown), then `bands` `solid` groups splitting the seeds
into **equal-count** runs by index (equal-area annuli), over the seeds
that remain after fitting. `R = radius`. Fit (§1 "Crowded groups"): compute
the actual minimum nearest-neighbour distance (brute force, n ≤ 300) and
shrink to it (all seeds share one scale); at the floor, lower `n` until it
fits. Seeds closer to the center emoji than
`emojiSize·(1.05 + scale)/2` are dropped (1–5 seeds in the prototype).
The spiral's spacing is nearly uniform (nearest-neighbour 61–65 px at 144
seeds), so its core never scatters the way rings did. Alternate: `null` in v1. "Empty"
removes the center emoji. `maxEmoji` 6.

**Lotus** *(rewritten 2026-10-08 in the slice 4 design, §1 "Lotus")*. Label
"Lotus". Controls: Layers 1–3 (default 2), Petals 4–16 (default 8, Shuffle
5–12), Petal width 30–90 % (default 80, Shuffle 50–90, shown as `80%`).
`maxEmoji` 6, `overlap` 0.15: every pair of emoji may come 15 % closer than
touching (petals may touch their neighbours), which the §7 sweep already
measures through `shape.overlap`. With `P` petals, `half = π/P`, and
`need(a, b) = emojiSize·(a+b)/2·(1-overlap)`:

1. **Bands.** `r0 = need(1.05, 1)` with the center emoji, 0 without. The
   space from `r0` to `radius` is split into `layers` bands with weights
   2, 3, 4 (outer bands wider). Layer `k`'s tips sit on its band's outer
   edge `T`; its petals start at `B = r0` for layer 1, otherwise
   `B = min(inner edge + 0.6·need(1,1), T - need(1,1))`, so outer petals
   start just clear of the inner layer's tips.
2. **Interleave.** Petal `j`'s axis is at `2πj/P`, plus `half` on even
   layers when Alternate ("Interleave petal layers", default on) is on.
   Every emoji of a petal has `heading` = the petal's axis, so Face outward
   turns the whole petal one way.
3. **Scale.** `fitRing({ r: T, count: P })` on the ring of tips gives the
   layer's single scale `s`. If its count is below `P`, the layer is
   dropped.
4. **Outline.** `lib.petalCurve(B, T, phiMax)` maps `t ∈ [0,1]` (base to
   tip) to `{ r: B + t·(T-B), phi: phiMax·sin(π·(0.25 + 0.75t)) }`, `phi`
   being the angle off the petal's axis: open base (0.71·phiMax), widest at
   t = 1/3, pointed tip. With `rw = B + (T-B)/3` (the widest point),
   `phiMax = min(half·width/100, half - asin(min(1, need(s,s)/(2rw))))`, so
   the widest points of neighbouring petals never collide. The petal is
   the tip plus side pairs at `±phi`, spaced `emojiSize·s` apart along the
   outline from the tip down to the base.
5. **Spoke.** If `2·rw·sin(phiMax) < need(s,s)` the petal is too narrow for
   two sides: the tip plus emoji down its axis every `emojiSize·s`, down to
   `B`.
6. **Crowding** (§1 "Crowded groups"). Units are tried in order (the tip,
   then each side pair or spoke emoji, from the tip toward the base). A unit
   is kept only if each of its points clears the inner layers and every
   point kept so far, **in every petal**, so every petal keeps the same
   units: the layer stays rotationally symmetric and each petal
   mirror-symmetric. If the tip doesn't fit, the layer is dropped. The petal
   count never changes.

Groups per layer, inside out: tips (`cycle`, size `P`, index = petal
number), then sides (`cycle`, size `P`, both sides of petal `j` and every
spoke emoji share index `j`); a layer whose petals kept only their tips has
no sides group. "Empty" removes the center emoji. With an odd `P` that
neither 2 nor 3 divides, each group is a single emoji (§1 accepted
consequence).

**Yantra** *(rewritten 2026-10-08 in the slice 5 design, §1 "Yantra")*.
Label "Yantra". Controls: Triangles 1–3 (default 1), Petals 8–16 step 4
(default 8; always a multiple of 4, so the lotus keeps the square's four-fold
symmetry). Alternate **"Offset petals"** (default off): the lotus turns by
half a petal, so its petals flank the gates instead of pointing at them.
`maxEmoji` 6, `overlap` 0.15 (as the lotus). Lines use the line scale
`ls = max(floor, 0.65)`; the bindu is 1.05; `need(a, b) =
emojiSize·(a+b)/2·(1-overlap)`.

1. **Bhupura.** A square with its corners on `radius` (half-side `h =
   radius/√2`), on a lattice of step `d = h/q`, `q = max(1, ⌊h/(emojiSize·ls)⌋)`:
   `lib.polygonPoints(4, radius, -3π/4, 2q)`. Heading: the side's outward
   normal (corners: radial).
2. **Gates.** In the band from the square's side to `radius`, `n = ⌊(radius
   - h)/d⌋` lattice steps deep (2 at emoji size 80, 4 at 44, 9 at 20), each
   side gets a classic T outline on the same lattice: neck half-width
   `w1 = max(1, round(n/4))`, head half-width `w2 = 2·w1`, neck length
   `a = ⌊n/2⌋`. Lattice cells (steps out `j`, across `t`): the neck `(1..a,
   ±w1)`, the shoulder `(a, ±(w1+1..w2))`, the head's sides `(a+1..n, ±w2)`
   and its top `(n, 1-w2..w2-1)`. The square's points with `|i - q| < w1` are
   left out (the opening). Heading: the gate's axis. If `n < 2` there are no
   gates and no opening (never in the 20–80 emoji size range).
3. **Outer star.** Lotus tips sit at `T = h - need(ls, ls)`; the outer star
   has circumradius `R1 = (0.58 + 0.08·(triangles - 1))·T`. A star of
   circumradius `R` is two triangles, up (vertex at -π/2) and down (+π/2),
   each `lib.polygonPoints(3, R, start, 3m)` with `m = max(1,
   ⌊(R/√3)/(emojiSize·s)⌋)`, so each side is split in thirds at the crossings
   (the **knots**, `i = m, 2m`, taken from the up triangle). Points next to a
   crossing are one step apart (the lines cross at 60°). Heading: the side's
   outward normal (vertices: radial).
4. **Lotus.** One ring of `P` petals with axes at `-π/2 + 2πj/P` (+ `π/P`
   with Offset): base `B = R1`, tips `T`, width 80 % of the half-petal angle,
   capped as the Lotus shape's (§5 Lotus 4). The petal is built both as
   `lib.petalOutline` and as `lib.petalSpoke`; whichever keeps more emoji is
   used. Heading: the petal's axis.
5. **Inner stars** `k = 1..triangles-1`: each turned 30° from the star outside it (so alternate stars share the outer star's orientation), scale `floor`,
   `R_k = R_{k-1}/√3 - need(floor, s_{k-1})`, so their tips point at, and
   clear, the outer star's knots.
6. **Crowding** (§1 "Crowded groups"). Everything is placed in the order
   above (bindu, square, gates, outer star, lotus, inner stars). A unit (a
   point with all its symmetric copies) is kept only if each point clears
   everything kept so far and the rest of the unit, so every part stays
   symmetric. Star units: the six vertices (if they fail, that star and every
   star inside it are dropped), then the knots, then the points `i` and
   `3m - i` on every side of both triangles, from the vertices inward.
   Lotus units: as the Lotus shape (tip, then side pairs or spoke emoji, in
   every petal at once). The square and gates sit on a lattice of step
   `d ≥ emojiSize·ls` and always fit; the lotus's tips and the outer star
   always fit too (checked by the sweep). Inner stars drop first: at emoji
   size 51 and above (58 with an empty center), Triangles 3 draws two stars.

Groups inside out, with fixed role slots: bindu (`solid`, slot 0); per star
from the innermost, up triangle (`solid`, slot 1), down triangle (`solid`,
slot 2), knots (`solid`, slot 0, echoing the bindu); lotus (`cycle`, size
`P`, index = petal number, slot 3, so petals alternate with p = 2); square
(`solid`, slot 5); gates (`solid`, slot 4). Consecutive groups always have
different slots. "Empty" removes the bindu (the knots keep slot 0). Layout
cost: about 1.5 ms for a thumbnail, up to about 9 ms at emoji size 20 with
Triangles 3 and 16 petals.

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
   returns `used`; palette cue; drag-to-reorder. It also folds in the
   ROADMAP "Toggles" item: switches become clickable on the pill (§1, §4)
   and the rings Alternate switch is renamed "Stagger alternate rings".
   Visible change: rings become seam-free and never overlap, and both
   toggles make a change visible at a glance at default settings. The sweep test regains "every
   placement within `radius + emojiSize`" (possible once spacing is
   clamped).
3. **Phyllotaxis spiral + shape strip + generated per-shape controls +
   Shuffle picks a shape.**
4. **Lotus** (adds `petalCurve`; `polygonPoints` moves to slice 5, which is
   the only shape that needs it).
5. **Yantra** (adds `polygonPoints`; moves the lotus's `outline`/`spoke`
   into `lib.js` as `petalOutline`/`petalSpoke`, no change to the lotus).
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
- **Browser** via `~/.tools/playwright` scripts: every control is driven by
  **real Playwright locator clicks/drags on the visible element** (setting
  `checked`/`value` from JS hides unclickable controls); no console errors;
  screenshots of each shape at defaults and slider extremes, desktop and
  phone width; drag-to-reorder by mouse and by touch emulation; I look at
  every screenshot myself. Slice 1 adds a pixel-diff script against a
  baseline captured before the refactor.

## 8. Out of scope

Persisting the chosen shape/settings; canonical fixed-figure presets;
per-placement colour or glyph effects; animation; user-defined shapes;
changes to export/share; PDF export (roadmap item 3).
