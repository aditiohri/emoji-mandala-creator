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
- [ ] Slice 3 — phyllotaxis spiral, shape thumbnail strip, generated
      per-shape controls, Shuffle picks a shape.
- [ ] Slice 4 — lotus / rosette.
- [ ] Slice 5 — yantra.
- [ ] Slice 6 — kolam / rangoli lattice.

Models: Opus writes plans and reviews; Sonnet implements slices 1–3;
Haiku slices 4–6 (escalate if it struggles). Screenshots are checked by
the orchestrating session before each merge.

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
