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

## 1. Customizable mandala shapes (next; spec in review)

Spec: `docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`.

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

## 3. Monetization experiment: template + build in public

Reframed: the app itself is probably not the product. The sellable
asset is the *system* for going from idea to a live, installable,
shareable app. The mandala maker is the demo and test subject, and
stays free, static, and serverless (no auth, no backend).

Two tracks, run together:

**A. Template / starter kit**
- Separate the generic parts (PWA manifest, share/save flow, module
  layout, deploy config) from the mandala-specific code.
- Write a "clone to live URL" README.
- Start as a free template repo with a waitlist; add paid extras only
  if there is demand.

**B. Build in public**
- Document the deploy/share workflow while it is fresh; it doubles as
  content and as the template's docs.
- Post short updates ("shipped X, here's how").

**Signals** (decide the thresholds *before* launching, so we are not
rationalizing afterward): template stars/forks/waitlist signups, and
followers/replies/"how did you do this?" messages.

**Then, depending on momentum:** expand into a guide/course (people
ask *how*) or a done-for-you build service (people ask *can you build
me one*).

**Optional side test:** a Stripe Payment Link for hi-res/PDF export,
as an independent willingness-to-pay signal.

**Deferred** unless the app itself shows traction: personal gallery,
accounts/sync, native mobile wrapper.
