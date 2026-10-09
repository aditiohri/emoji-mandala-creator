# Roadmap

Shipped: easier palette building (native emoji keyboard entry + full
emoji-library browser), on-screen zoom (desktop only), a clearer
desktop save flow, a separate Share button, and (October 2026):

- Code split into `styles.css` + plain ES modules under `js/` (no build
  step, no framework).
- Emoji cycle by position per ring instead of being random (meant to make
  "Alternate ring direction" and "Rotate emoji outward" readable; they
  turned out not to be — see item 1, "Toggles").
- Palette defaults to the person's most-used emoji on all devices
  (`js/usage.js`, per-device `localStorage`; counts adds only).
- User-selectable backgrounds: presets plus custom solid / gradient /
  image, saved per device (`js/backgrounds.js`).
- Desktop layout: canvas pinned to the top of the stage and sticky while
  the controls scroll.

Still open, roughly in the order we'd tackle them:

## 1. Customizable mandala shapes (in progress)

Spec (approved 2026-10-08, reviewed twice):
`docs/superpowers/specs/2026-10-08-mandala-shapes-design.md`. Goal: "a
visible, distinct, elegant pattern every time, no matter what the user
does." Each slice gets its own plan in `docs/superpowers/plans/`.

- [x] **Slice 1 — engine, no visible change** (merged 2026-10-08).
      Shape interface, rings port, legacy colouring, `renderTo`,
      `state.shapeParams.rings`; 0 px differ from the pre-refactor baseline
      (`~/.tools/playwright/pixeldiff.mjs`, `baselines/shapes-slice1/`).
- [x] **Toggles** (fixed in slice 2). The pill wasn't clickable because
      each switch was a `<div>` around a 0×0 checkbox; switches are now
      `<label class="switch">` (verified by real mouse clicks). Once
      colouring became symmetric, both toggles read at a glance; Alternate
      is renamed "Stagger alternate rings" (its direction reversal never
      shows on rings). Soft glow strengthened so it reads too.
- [x] **Slice 2 — pattern, fit, palette rules** (merged 2026-10-08).
      Symmetric `assignEmoji` (≤ 6 emoji from the front of the palette),
      fitted rings (never overlap, evenly re-spaced; spacing > 1.0× opens
      the center), Soft glow switch replaces Backdrop/guide rings, palette
      "using K of N" cue, drag/arrow-key reorder, no duplicate emoji.
      Checked by `~/.tools/playwright/slice2.mjs` and `clicks.mjs`.
      Leftovers: two-finger drags of two chips at once can mis-order;
      arrow keys on a focused × move its chip; drop slots go stale if the
      page scrolls mid-drag; duplicate check treats ❤ and ❤️ as different;
      rings' groups still declare a `reverse` that cancels out.
- [x] **Slice 2 follow-ups** (fresh whole-session review, 2026-10-08).
      All done (slice 3 design + implementation, small-followups):
      - [x] **Spec §5 rings text** rewritten to match the slice 2 code.
      - [x] **Crowded cores look jumbled** — decided from screenshots of
            four options: a ring that can't hold its full symmetry is
            dropped (open halo around the center); same rule for later
            shapes (spec §1 "Crowded groups"). Implemented in slice 3.
      - [x] **Phone: chips block page scroll** — decided: chips get
            `touch-action: pan-y` (spec §1 "Phone chip drag"). Slice 3.
      - [x] **Browse gives no feedback** — resolved differently in
            small-followups: duplicates are allowed on purpose (weights);
            each pick shows an aria-live note in the dialog ("🌸 added (×2
            in your palette)"). The ❤/❤️ mismatch no longer matters.
      - [x] **Chips have no accessible name** — slice 3, including × labels
            that tell duplicates apart ("Remove 🌸 (2 of 2)").
- [x] **Slice 3 — spiral, shape strip, generated controls, Shuffle picks
      a shape** (merged 2026-10-08). Phyllotaxis spiral (Seeds, Divergence,
      Bands); shape strip of live thumbnails above the shape's generated
      sliders, each shape remembering its values; Shuffle picks a shape;
      crowded rings dropped (open halo) instead of re-spaced; palette chips
      scroll on phones (`pan-y`), have accessible names, and × buttons tell
      duplicates apart. Checked by `~/.tools/playwright/slice3.mjs` (90
      checks, real input, screenshots judged by eye).
      Deferred minors (final review: none block): thumbnails redraw on
      every draw (revisit with heavier shapes); unused `target` param in
      `bindRange`; spiral `layout` reads `this.overlap` (call as a method).
- [ ] Slice 4 — lotus / rosette. Spec §5 "Lotus / rosette" is thinner
      than the spiral's was; settle these in a short design chat (with
      screenshots of options) before planning:
      - `lib.petalCurve` geometry is undefined: where the tip and the two
        side emoji sit, and how Petal length maps to it.
      - Layer radii: how layers 1–4 space out, and how they relate to the
        center emoji and to `radius`.
      - Crowding under spec §1 "Crowded groups" (remove elements, keep the
        structure): drop outer layers? Fewer petals would change the
        count, the very thing rings stopped doing. And how `overlap` 0.15
        (petals may touch) fits the all-pairs sweep test.
      - `polygonPoints` is listed for slice 4 but only yantra (slice 5)
        needs it; decide whether to defer it (YAGNI).
      Carry-overs from slice 3: thumbnails redraw on every draw (revisit
      now that a third tile arrives); `slice3.mjs` section 6 has per-shape
      `SETS`: add a lotus entry rather than a new script.
- [ ] Slice 5 — yantra.
- [ ] Slice 6 — kolam / rangoli lattice.

Models: Opus writes plans and the whole-branch review; Sonnet/Haiku
implement and review tasks (user asked 2026-10-08 to use Sonnet and Haiku
wherever possible to save usage); Haiku slices 4–6 (escalate if it
struggles). Screenshots are checked by
the orchestrating session before each merge.

## 2. Small follow-ups

Done on branch `small-followups` (merged 2026-10-08):

- [x] **Select new custom background.** "Add to backgrounds" selects,
  saves and redraws the new swatch. Also fixed: solid and gradient swatches
  were never highlighted as active, and removing a custom swatch now keeps
  the selection correct.
- [x] **Image-upload backgrounds.** Tested in a browser with the file
  chooser: selected, drawn, and restored on reload. Fixed: clicking a
  stored image swatch did nothing; the remove ✕ was unreachable, then a
  full-swatch overlay that deleted on any click; it's now a corner badge,
  visible on touch and focus.
- [x] **Most-used counts only rise on add** — decided: leave as is. The
  startup palette is a convenience, and "most used" means "most often
  added". Alternative for later: count emoji in saved or shared images.

Still open:

- **New idea: save palettes (maybe a paid feature).** The palette is
  rebuilt from usage counts on every load, so palette order and duplicates
  last for the session only. Persisting named palettes could be premium.
- Background swatches aren't keyboard-selectable (they're divs).
- An upload that exceeds the localStorage quota only logs a warning, so
  the image won't survive a reload.
- The light-cream preset is nearly invisible on the cream panel.

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
