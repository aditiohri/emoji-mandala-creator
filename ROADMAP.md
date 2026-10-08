# Roadmap

Shipped: easier palette building (native emoji keyboard entry + full
emoji-library browser), on-screen zoom (desktop only), a clearer
desktop save flow, a separate Share button, and (October 2026):

- Code split into `styles.css` + plain ES modules under `js/` (no build
  step, no framework).
- "Alternate ring direction" and "Rotate emoji outward" now visibly work
  (emoji cycle by position per ring instead of being random, so the
  direction is readable).
- Palette defaults to the person's most-used emoji on all devices
  (`js/usage.js`, per-device `localStorage`; counts adds only).
- User-selectable backgrounds: presets plus custom solid / gradient /
  image, saved per device (`js/backgrounds.js`).
- Desktop layout: canvas pinned to the top of the stage and sticky while
  the controls scroll.

Still open, roughly in the order we'd tackle them:

## 1. Customizable mandala shapes (next; needs a spec first)

Today `draw()` hardcodes concentric rings of evenly spaced emoji. Many
traditional mandala families don't fit that: yantras (interlocking
triangles, lotus petals, nested squares with gates), rangolis (dot grids
and kolam-style lattices, petal motifs), flower/phyllotaxis spirals,
rosettes, etc.

Direction (to be confirmed in the brainstorm/spec, not decided):

- A "geometry" abstraction: a shape takes the current controls (rings,
  symmetry, spacing, rotation, ...) and returns a list of placements
  `{x, y, rotation, scale, ring/group}`; `draw()` just renders them.
  Today's behaviour becomes the first shape ("Concentric rings").
- One file per shape under `js/shapes/`, behind a shared interface, so
  shapes can be added one at a time.
- Decide how existing controls map onto shapes that don't have "rings",
  how shapes interact with backgrounds/backdrops (e.g. a shape could
  also draw guide lines), and how alternate/face-outward generalize.
- Build in slices: spec -> interface + concentric-rings port -> one new
  shape (e.g. phyllotaxis spiral) -> more.

## 2. Small follow-ups

- Selecting a newly created custom background right after adding it
  (currently it's added but not selected).
- Image-upload backgrounds are untested in a browser.
- Most-used counts only increment when an emoji is added to the palette,
  so emoji already in the default palette aren't counted until removed
  and re-added; decide whether that's good enough.

## 3. Paid tier: personal gallery + PDF export

Biggest unknown, not yet scoped. Open questions before this can get a
real design:

- A gallery of saved mandalas means *somewhere to save them* — this
  app has no backend today. Per-device (`localStorage`/IndexedDB,
  free but not synced across devices) vs. real accounts + storage
  (synced, but a real backend to build and pay for)?
- What does "paid" actually gate, and how — a one-time unlock, a
  subscription, a simple client-side flag? Needs a payment processor
  either way (e.g. Stripe), which is new infrastructure for a
  currently static, serverless site.
- PDF export is more self-contained (can likely be done client-side,
  e.g. rendering the canvas into a PDF via a small library) and could
  ship independently of the gallery/accounts question.
