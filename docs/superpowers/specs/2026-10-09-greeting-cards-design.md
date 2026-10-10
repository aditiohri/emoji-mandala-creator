# Greeting cards, part 1: message on a card (ROADMAP item 5a, MVP)

Decided with the user 2026-10-09 (Q1-Q6 below); the rest are Claude's
recommendations, which the user asked to go with (marked **[rec]**). Static site,
no build step, no accounts: sending is the existing Save / Share flow.

**Must not regress:** the a11y gains from slices A-D (aria-expanded, accessible
names, 44 px targets, focus ring, forced colors, reduced motion); the phone strip
and landscape layouts; a mandala with **no message** must export pixel-identical
to today (`pixeldiff.mjs` baselines).

**Out of scope** (ROADMAP 5b-5d and others): layouts A (band), C (above and
below), D (center) and F (name as a ring); occasion presets; font / colour / size
choices; feedback button (4b); per-shape saves (4c); device a11y checks; item 3.

Mockups judged during the brainstorm (scratchpad, not committed): eight
placements, A-H. Letters scattered into the pattern's symmetry (G, H) were
rejected because they stop reading as words; only text laid along a path keeps
the letters in order.

## 1. What the person sees

A new collapsible **Card** section, below Background and above the Save / Share
footer (Q4). Contents, in order:

1. **Message** `<textarea id="cardMessage">`, visible label "Message", hint "Line 1
   is the greeting, line 2 an optional sign-off." At most **two lines** (Q6):
   Enter on line 2 does nothing; pasted text is cut to two lines; each line at
   most **60 characters** (enforced in `input`, not by `maxlength`, which counts
   the whole box). Placeholder: "Happy birthday, Maya!⏎love, Didi".
2. **Layout**: a group (`role="group"`, labelled "Layout") of two toggle buttons
   with `aria-pressed`, each at least 44 x 44 px with a small decorative SVG icon
   and a text label:
   - **Caption** (mockup B, the default)
   - **Around the edge** (mockup E)
   When the message is empty a hint under the group says "Type a message to see
   it on the card." Buttons stay enabled (the choice is remembered).
3. **Share note** `<textarea id="shareNote">`, label "Share note", hint "Sent with
   the image when you share. Follows your message until you edit it." (Q5).
   Shown only where native file sharing exists (the same `canNativeShare` test
   that unhides the Share button today); hidden otherwise, with nothing in its
   place.

`"card"` is added to `SECTION_IDS`; it gets the same header button, chevron,
`aria-expanded` / `aria-controls` and counts in the master button's
all / none / some state. First visit: open on desktop, closed on phones (the
existing `defaultSections` rule: only Shape opens on phones). A stored sections
map without `card` falls back to that default (already how `parseSections`
works).

The canvas preview shows the card exactly as it will be saved (it is the same
canvas that `toBlob` exports). Typing redraws on `input`.

## 2. The two layouts (canvas, 1000 x 1000, square always)

Both apply **only when the message has text**. Empty message: the mandala is
drawn full size exactly as today, whatever layout is selected.

Text colour: the existing ink (`#241c38` on light backgrounds, `#f2ecdd` on dark,
from the same luminance decision `drawBackground` already returns). **[rec]**
Contrast: on **gradient and image** backgrounds the text gets a soft halo in the
opposite ink (stroke under the fill, about 0.14 em wide, ~85 % opacity) because
an average luminance can be wrong at one end of a gradient or over a busy photo.
Solid and Auto backgrounds get no halo. Checked per preset (section 7).

Fonts **[rec]**: line 1 in **Fraunces 600** (the app's heading font), line 2 in
**Sora 500**, both already loaded from Google Fonts by `index.html`. Each canvas
font string ends with the emoji fonts and a generic family
(`… 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji', serif`), so emoji
in a message render and an offline load still draws text. On startup, after
`document.fonts.load()` for both faces resolves (or fails), redraw once so the
first card frame isn't in a fallback font.

Sizes below are starting values in canvas pixels; tune by eye from screenshots,
then record the final numbers in the code's constants.

### Caption (B)

- Mandala drawn at **76 %** of the canvas (diameter 760) centred at (500, 400).
- Line 1: centred, baseline area around y = 865, starting at 64 px and shrinking
  in 2 px steps to fit within 900 px width, minimum 40 px. If it still doesn't
  fit at 40 px it **wraps to two rows** (break at the last space that fits;
  otherwise break the word) and the mandala shrinks to **70 %** centred at
  (500, 370), rows near y = 830 and 890.
- Line 2: centred below line 1 (about y = 940, or 960 when line 1 wrapped),
  Sora 40 px shrinking to a minimum of 28 px within 800 px; if still too wide
  at 28 px, cut with an ellipsis (the 60-character cap makes this rare).

### Around the edge (E)

- Mandala drawn at **72 %** (diameter 720), centred at (500, 500).
- Line 1 on a circle of radius **420**, centred over the top, reading left to
  right, each glyph rotated to the tangent. Start 58 px, shrink to fit an arc of
  at most **160°**, minimum 32 px (60 characters fit at 32 px).
- Line 2 along the bottom on radius **425**, centred at the bottom, reading left
  to right and **upright** (glyphs rotated so their tops face the centre, the
  path running counter-clockwise), Sora 40 px shrinking to 28 px within 140°.
- Glyphs are measured per grapheme (`Intl.Segmenter`, falling back to
  `Array.from`) so emoji and combining marks are never split.

## 3. Drawing (the export path)

Everything is drawn into the one `#canvas`, so Save, Share and the long-press
fallback (`toDataURL`) all carry the text with no extra step.

- `renderTo(ctx, W, opts)` gains an optional `opts.area = { cx, cy, size }`: the
  background still fills the whole W x W; the soft glow and the mandala are
  centred at (cx, cy) and scaled to `size` instead of W. Default (no `area`) is
  the full canvas, so a no-message draw takes the same code path as today and
  stays pixel-identical. `drawBackground` takes the glow centre and radius from
  the same values.
- New **`js/card.js`**, pure (no DOM), unit-tested:
  - `cardLines(text)` → `[line1, line2]` trimmed, at most 2 lines of at most 60
    characters each; if line 1 is empty, line 2 moves up to become line 1.
  - `cardLayout(lines, layoutId, measure)` → the mandala `area` plus a list of
    text runs (`{ text, font, x, y }` for Caption, per-glyph
    `{ glyph, font, x, y, angle }` for the edge). `measure(text, font)` is
    injected (canvas `measureText` in the app, a stub in tests) so fitting,
    wrapping and arc maths are testable in Node.
  - `cardFilename(line1, date)` and `shareFields(message, note, mirrored)` (see
    section 4).
- `draw.js` asks `card.js` for the layout and draws the runs after the mandala
  (halo stroke first when needed, then fill).
- State: `state.card = { message: "", layout: "caption", note: "",
  noteMirrors: true }`.

## 4. Filename and share text

- **Filename [rec]:** from line 1: lower-case; every run of characters that isn't
  a Unicode letter or digit (`\p{L}\p{N}`) becomes one hyphen; trim hyphens; cut
  to 40 characters at a hyphen where possible; add `.png`. Example: "Happy
  birthday, Maya! 🎂" → `happy-birthday-maya.png`. Empty or nothing left → the
  current `mandala-YYYY-MM-DD.png`. Used by desktop download, the Claude
  downloads path and the shared `File`. The existing announcement already says
  the filename.
- **Share note (Q5):** while `noteMirrors` is true the note box shows the
  message (both lines, joined with a newline) and updates as the message
  changes. Any edit to the note box sets `noteMirrors = false`; clearing the
  note box sets it back to true and it refills from the message.
- **`navigator.share` fields**, for both the Share button and the touch
  "Save / share" path: `title` = line 1, or "Emoji mandala" when there is no
  message (as today); `text` = the note when it is non-empty, otherwise omitted.
  `files` unchanged apart from the filename.

## 5. Accessibility

- The message is real text in the page (the textarea) and in the canvas name:
  with a message the canvas `aria-label` becomes
  `Greeting card: "Happy birthday, Maya! / love, Didi". ` + the existing
  description; the export panel `<img>` gets the same as its `alt`.
- **Not announced while typing [rec]:** the live `#mandalaStatus` announcement
  keeps using the shape description only, so the message is never read back on
  each keystroke. Changing the layout announces through the button's
  `aria-pressed` state, nothing extra.
- Textareas have visible `<label>`s and hints linked by `aria-describedby`; the
  60-character and two-line limits are stated in the hint, not just enforced.
  When a paste is cut, a polite status line says "Cut to two lines of 60
  characters."
- New controls use the existing `.btn`, focus ring and forced-colors rules; the
  layout icons are `aria-hidden` and use `currentColor` so they survive forced
  colors.
- Contrast check in section 7.

## 6. Saving between visits [rec]

- **Layout** is saved per device (`localStorage["mandala.card.layout"]`).
- **Message and share note** survive a reload in the same tab
  (`sessionStorage["mandala.card"]`) but not a new visit: a card is usually a
  one-off, and a stale "Happy birthday, Maya!" on next week's mandala would be a
  surprise. All storage access in `try`/`catch` like the rest of the app.
- **Shuffle** never changes the card fields.

## 7. Testing and review

- **Unit (`node --test tests/*.test.mjs`)**, new `tests/card.test.mjs`:
  `cardLines` limits and trimming; filename slugs (punctuation, emoji, accents,
  all-emoji → date fallback, 40-char cut); `shareFields` mirroring rules; Caption
  fit / shrink / wrap with a stub `measure`; edge arc capacity (60 chars fit at
  minimum size within 160°; bottom line upright: angles increase
  counter-clockwise). Existing 115 tests still pass.
- **Pixel diff:** with an empty message, `pixeldiff.mjs compare` against fresh
  baselines captured on `main` before the change shows 0 px difference.
- **Playwright, real input** (new `~/.tools/playwright/cards.mjs`): type into the
  message with the keyboard (including Enter, a third line refused, a long paste
  cut with the status line); click both layout buttons; screenshot grid of
  {Caption, Edge} x {short, long-wrapping, line-1-only, with emoji} x
  {Cream, Deep purple, Coral to violet gradient, a photo} at 1000 px, judged by
  eye. Share: stub `navigator.share`/`canShare` and assert `files[0].name`,
  `title`, `text` for mirrored, edited and cleared notes; desktop Save asserts the
  download's suggested filename. Reload keeps message and layout; a new context
  keeps only the layout.
- **Contrast:** for each preset background sample the pixels behind the text
  bounds and report the contrast ratio of ink (with halo where applied) against
  them; aim for 4.5:1, report any below.
- **Layout regression:** page screenshots at desktop, phone portrait (390 x 844)
  and phone landscape (844 x 390) before and after, judged by eye: only the new
  Card section differs; the strip, sticky canvas and master button are unchanged.
- **A11y:** axe 0 violations with all sections open (the `OPEN=1` init-script
  trick from slice D); Tab order reaches message → Caption → Around the edge →
  share note → footer; both layout buttons 44 px; forced-colors screenshot of the
  Card section.

## Deferred / known

- On the phone strip (canvas about 160-300 px) the text is small; it is a
  preview, and the saved PNG is 1000 px. Revisit with 5d (sizes).
- Right-to-left scripts on the edge layout are not tuned (the arc lays glyphs
  left to right). Caption handles them through the browser's normal text
  drawing.
