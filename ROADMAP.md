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

## 1. Customizable mandala shapes (done, 2026-10-09)

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
- [x] **Slice 4 — lotus** (merged 2026-10-08). Layers of outlined petals
      (`lib.petalCurve`: open base, widest a third of the way up, pointed
      tip) in bands that widen outward; Layers / Petals / Petal width
      sliders and "Interleave petal layers"; a third strip tile, and
      Shuffle can pick it. Crowding keeps the petal count: too-narrow
      petals become spokes, and tips, side pairs and spoke emoji are kept or
      dropped in every petal at once. Checked by
      `~/.tools/playwright/slice4.mjs` (125 checks, real input, screenshots
      judged by eye). The design questions are all settled (spec §1
      "Lotus"); `polygonPoints` moves to slice 5.
      Carry-over closed: three thumbnails redraw in about 1 ms, so they
      keep redrawing on every draw.
      Known and accepted: 3 layers × 4 petals at width 90 gives bowl-shaped
      outer petals. With an empty center and big emoji, layer 1 may keep
      only its tips or be dropped (spec §1 "Crowded groups").
      Deferred minors (final review: none block):
      - The lotus sweep's 0.95 slack isn't needed: the worst pair is at
        1 − 1e-15 of the required distance. It's the convention across all
        shape tests, but it could be tightened to catch regressions.
      - Interleave picks layers by number, not by kept position. This is
        harmless today, because only layer 1 is ever dropped.
      - Still open from slice 3: the unused `target` param in `bindRange`,
        and spiral `layout` reads `this.overlap`.
- [x] **Slice 5 — yantra** (merged 2026-10-09). A bindu, 1–3 nested
      hexagrams drawn as full triangle lines (inner ones turned 30°), one
      ring of outlined lotus petals, and a square (bhupura) with four classic
      T gates. Triangles / Petals (8, 12, 16) sliders and "Offset petals";
      a fourth strip tile, and Shuffle can pick it. `polygonPoints` and the
      lotus's petal builders (`petalOutline`/`petalSpoke`) now live in
      `lib.js`; the lotus is unchanged (22308 of 22308 layouts identical).
      Crowding drops inner stars first and keeps the square, gates, outer
      star and lotus tips. Checked by `~/.tools/playwright/slice5.mjs` (151
      checks, real input, screenshots judged by eye). Four thumbnails redraw
      in about 2.7 ms, so they keep redrawing on every draw. All design
      questions settled (spec §1 "Yantra").
      Known and accepted: at emoji size 80 the outer star has only vertices
      and knots, and lotus petals shrink to tips when crowded (16 petals +
      Triangles 3 from size 65; 12 petals from 72). With Triangles 3 at the
      default size 44 the innermost star keeps only its six vertices (a ring
      of dots round the bindu). Triangles 3 draws two stars from size 51
      (58 with an empty center). With fewer than 6 emoji in the palette,
      wrapped slots can share a colour (spec §3 promises distinct colours
      only with at least `maxEmoji` emoji).
      Deferred minors (final review: none block):
      - `star()` re-tags the down triangle via `kept.slice(-3)` /
        `slice(-down.length)`, which relies on `add` pushing a unit in order;
        a role per point would be sturdier.
      - The yantra skips the outline (not compares it) when petals are too
        narrow; the result is the same, since only the tip could be kept.
      - Beyond the slider range (emoji size 100+, or canvas under 800 px)
        the gates can vanish and `radii[k]` can go non-positive. Unreachable
        today.
      - Shuffle turns "Offset petals" on 60 % of the time though its default
        is off (shared `randomParams` rule).
      - `polygonPoints` has no test for `perSide = 1` beyond the radius.
      - Still open from slices 3–4: lotus sweep's 0.95 slack; Interleave
        picks layers by number; unused `target` param in `bindRange`; spiral
        `layout` reads `this.overlap`.
- [x] **Slice 6 — kolam / rangoli lattice** (merged 2026-10-09; the build
      order is finished). Each lattice dot is an emoji inside a diamond of
      line emoji; neighbouring diamonds touch at shared "knots". Dots, knots
      and lines have separate colours; Grid (3–9, odd) and Spacing sliders
      and "Checker colours"; fifth strip tile; Shuffle can pick it. Crowding
      drops rings of dots until the diamonds show, then thins the middle of
      each side first; every point is kept or dropped with all its symmetric
      copies. Checked by `~/.tools/playwright/slice6.mjs` (177 checks) and
      89 unit tests. Spec §1 "Kolam" and §5; plan
      `docs/superpowers/plans/2026-10-09-shapes-slice-6-kolam.md`.
      Known and accepted: Grid 9 shows the same as Grid 7 at the default
      emoji size (the lattice loses a ring of dots); at size 80 Grid 5–9 show
      Grid 3.
      Carried over (minors): lotus sweep's 0.95 slack; Interleave picks
      layers by number; unused `target` param in `bindRange`; spiral `layout`
      reads `this.overlap`; yantra minors from slice 5; Checker colours does
      nothing visible with a 3-emoji palette (slots 0/3 and 1/4 collapse;
      within the §3 contract, could be noted in the spec); kolam test nits
      (knot test title overstates, sweep early-break undocumented).

Models: Opus writes plans and the whole-branch review; Sonnet/Haiku
implement and review tasks (user asked 2026-10-08 to use Sonnet and Haiku
wherever possible to save usage); Haiku slices 4–5, Sonnet slice 6 (escalate if it
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

Next up (decided 2026-10-09; build in public is tabled). Two separate
sessions, in this order:

- [x] **Session A, small fixes** (done and pushed 2026-10-09; branch
  `worktree-small-followups-2`, merged fast-forward; its worktree and the
  older `small-followups` one are both stale, safe to remove):
  - Light-cream preset: inactive swatches get a `--line` border, so pale
    colours show on the panel.
  - Quota: `saveCustomBackgrounds` reports failure; a too-big image upload is
    still drawn for the session (no swatch, not saved) and a note under the
    swatches says it will be gone after reload. The note clears on the next
    pick.
  - Keyboard: each swatch holds a real `<button class="bg-select">` (Tab,
    Enter, Space, `aria-pressed`, label); focus is restored after the list
    re-renders. Checked by `~/.tools/playwright/fu2.mjs` (real key presses
    and file chooser, screenshots judged by eye) and 89 unit tests.
- [x] **Session B, save palettes** (done 2026-10-09, branch
  `worktree-save-palettes`): per-device `localStorage` (`mandala.savedPalettes`),
  auto-named from the first 3 emoji, load / rename inline / delete with Undo,
  cap 20, quota and corrupted-storage handling, no paid gate. Spec
  `docs/superpowers/specs/2026-10-09-save-palettes-design.md`. Checked by
  `~/.tools/playwright/sp.mjs` (57 real-input checks) and 104 unit tests.
  Follow-ups: "Update" a saved palette in place, reorder the saved list,
  export/import.
  Deferred minors (whole-branch review: none block):
  - Row lookups interpolate the stored id into a selector
    (`.saved-row[data-id="${id}"]`); a hand-edited id containing `"` throws
    on delete or rename. Use `CSS.escape` or compare `dataset.id`.
  - A rename to a taken 24-character name becomes "<24 chars> 2"; reload cuts
    it back to 24, so two rows share a name. Cap the base so base + suffix
    fits.
  - Two tabs overwrite each other's saves (list loaded once at startup;
    accepted in the spec).
  - Rename input has no `maxlength`; over-long input is trimmed silently.
  - The status note toggles `hidden` and its text in the same tick (some
    screen readers miss the first announcement; the background note does the
    same); `list-style: none` drops the list role in Safari.

## 3. Monetization experiment: template + build in public (TABLED 2026-10-09; do not start)

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

## 4. Accessibility, touch and screen reader (decided 2026-10-09; do this next)

One track, run serially at first: the sliders, drag-reorder and screen-reader
fixes touch the same UI files, so parallel orchestrators would conflict. Known
pain: some sliders are hard to use on mobile; drag-reorder of palette chips
is sticky and unreliable on touch; screen-reader use should be easy.

> **STATUS (2026-10-09).** Automated audit layers are done (20 findings, held
> in `~/.tools/playwright/a11y/RESULTS-2026-10-09.md`, outside the repo). New
> order, decided with the user: **implement the fixes first, then run the
> device checklist on the fixed app** ([`docs/a11y-device-checklist.md`](docs/a11y-device-checklist.md):
> iPhone Safari + VoiceOver, Samsung Chrome + TalkBack), so manual testing
> finds what automation can't rather than what we already know. When the user
> is back at the laptop: grant Terminal Accessibility permission and run
> real VoiceOver via Guidepup. Then merge all layers into the findings list.

- [ ] **Audit session** (first). Four layers, merged into one ranked findings
  list written here (severity, file, suggested fix, which fixes touch the
  same files):
  1. Headless Playwright (`~/.tools/playwright`): axe-core, accessibility-tree
     dump (role/name/value of every control), keyboard-only run, touch
     emulation with target-size measurements and scripted slider/drag gestures.
  2. Guidepup driving desktop VoiceOver on the Mac (not headless; needs
     accessibility permissions; check it works on this macOS first).
  3. Device checklist (Claude writes it; the user runs it): **iPhone**
     (Safari + VoiceOver) and **Samsung tablet** (Chrome + TalkBack). Shared
     task script: build a mandala, adjust each slider, reorder emoji, save a
     palette, export. Per step note what was announced, where it stuck,
     whether it finished.
  4. Merge the three into the findings list.
- **Fix slices (decided 2026-10-09; findings and statuses in
  `docs/a11y-audit-findings.md`).** A (names, headings, announcements) and B
  (contrast, focus ring, forced colors, reduced motion) are DONE, commits
  `84e0545` and `6eefc85`. **D, phone layout and touch** is DONE (spec
  `docs/superpowers/specs/2026-10-09-phone-layout-design.md`: sticky mandala
  strip about 33vh, collapsible sections with Show/Hide all, 44 px touch
  targets, slider-swipe fix, landscape two-column).
  **C, palette** (Quick add as buttons, a non-drag way to reorder, cross-row
  drag, fewer tab stops) is NEXT and still needs a design chat
  (design first, then spec on disk, then /clear, then build). D is merged, so
  the palette section now lives in a collapsible `#section-palette-body`;
  chips and their × stay under 44/24 px until C. Also open for C: F13
  focus-after-remove. Device checklist (`docs/a11y-device-checklist.md`) is
  still pending the user; it may add palette findings, so ask whether results
  are in before designing.
- [ ] **Fix slices**, original note, cut from the findings. Likely shapes: native or proper
  ARIA sliders with bigger hit targets; a non-drag way to reorder chips
  (move up/down buttons or a keyboard mode); labels, focus order and live
  announcements for changes to the mandala. Deferred a11y minors from
  section 2 (status note `hidden` + text in one tick; `list-style: none`
  drops the list role in Safari) belong here.
- Parallelism: only after the audit shows which files each slice touches, and
  only for slices that do not overlap.

## 5. Platform: device UX (exploration only, after item 4)

Not a feature; run as a separate exploratory session, outside the plan
pipeline. Starting view (to test, not settled): the PWA already installs and
runs full screen, so first polish manifest, icons and share/save-to-photos.
A Chrome extension fits poorly (suits tools that act on pages). A native app
is cheapest as a Capacitor wrap of the existing web code (store presence,
native share/photos). Rust has no clear role (no heavy compute, and the
project is deliberately build-free); revisit only on a real performance wall.
Item 4's fixes carry over to any wrapper, so nothing is wasted by going first.

## 6. Greeting cards: add a message and send (idea; ideate separately, not started)

Let someone add their own text to a mandala and send it like a greeting card.
Raised 2026-10-09; to be designed in its own session, after item 4. Open
questions to settle then:
- Where the text goes (over the mandala, a frame or caption, or a card layout
  around it) and how it is styled and wrapped.
- Filename comes from the message instead of the default
  `mandala-<date>.png`; share/save sheet text carries the message rather than
  the default "Emoji mandala" title.
- Accessibility from the start: the message as real text (alt text for the
  exported image, readable by screen readers), contrast over any background.
- Still static and serverless (no accounts); sending means the existing
  save/share flow.
