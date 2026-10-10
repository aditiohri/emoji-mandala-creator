# UI polish (ROADMAP item 4)

Decided with the user 2026-10-09. Static site, no build step. The a11y gains
from slices A-D (aria-expanded, accessible names, 44 px targets, focus ring,
forced colors, reduced motion) must not regress.

**Out of scope** (moved to ROADMAP): the GitHub feedback / bug-report button,
saved settings per shape. Greeting cards, device a11y checks and tabled item 3
are untouched.

## 1. Rename the first background presets

Pure label change in `PRESET_BACKGROUNDS` (`js/main.js`); the label is also the
swatch's `aria-label`. No caption.

- "System" -> "Auto (matches device)" (keeps its split swatch)
- "Light cream" -> "Cream"
- "Dark purple" -> "Deep purple"

Presets are matched by value/type, never by label, so nothing stored changes.
Grep tests and Playwright scripts for the old labels and update them.

## 2. "Show all controls" becomes an icon with a mixed state

The master button (`#toggleAll`) is icon-only: an inline SVG double chevron
(`aria-hidden`), styled like the section chevrons, 44 x 44 px minimum, with a
`title` tooltip equal to its accessible name, same focus ring as other buttons.

| Sections open | Icon | Accessible name | Click |
| --- | --- | --- | --- |
| all | double chevron up | "Hide all controls" | hide all |
| none | double chevron down | "Show all controls" | show all |
| some (mixed) | top chevron up, bottom chevron down | "Show all controls" | show all |

- `sections.js` gains `openState(map)` -> `"all" | "none" | "some"`; `allOpen`
  stays. `apply()` in `setupSections` sets the icon (a `data-state` attribute
  drives which SVG shows), `aria-label` and `title`.
- In the mixed state `aria-describedby` points at an `sr-only` line, "2 of 3
  sections open", updated in `apply()`. It is cleared in the other states.
- Per-section indicators are the existing header chevrons (rotate with
  `aria-expanded`); no second indicator. Check in screenshots that all three
  states are visible and distinguishable.

## 3. Master button stays in view on desktop (bug)

Cause: `.toggle-all` is `position:absolute; bottom:8px` inside `.stage`, which is
as tall as the whole controls panel, so the button sits at the bottom of the page;
only `.canvas-wrap` is sticky.

Fix: wrap `.canvas-wrap` and the button in one `.stage-pin`. On desktop
(`min-width: 861px`) the wrapper takes the sticky behaviour (`position:sticky;
top:28px`) that `.canvas-wrap` has now, and the button is positioned in the
wrapper's bottom-right corner. On phone and landscape the existing sticky strip
rules (`.stage`) stay as they are; the wrapper must be layout-neutral there (the
button keeps its current place). Verify desktop, phone portrait and landscape.

## 4. Custom colours live inside Background

Replaces the collapsed "Custom" `<details>` and the Type dropdown.

Layout, always visible under the swatches and the Soft glow row:

1. Heading "Custom colours".
2. Color 1 picker (`type=color`).
3. "Gradient" switch (same `label.switch` as the other toggles). On: reveals
   Color 2 and Angle. Off: solid colour.
4. Preview swatch (decorative, `aria-hidden`; the canvas is the real preview).
5. "Save to my backgrounds" button.
6. Image upload stays, as its own row ("Or use an image"); unchanged behaviour.

Behaviour:

- **Live:** any `input` event on a picker, the switch or the angle slider sets
  `state.background` immediately (solid or gradient, `idx` unset) and redraws;
  the preview swatch updates too. No "add" step is needed to see it.
- An unsaved live background is persisted and restored on reload like any
  background (existing `setBackground(saved)` branch). No preset swatch is
  highlighted unless the value matches one (`activeBackgroundIndex` already
  matches by value).
- **Save to my backgrounds** pushes the current custom background into
  `customBackgrounds` (existing storage and cap/quota handling, remove badge as
  today), selects that swatch, and announces "Saved to your backgrounds" through
  the existing status note. If the same value is already in the collection it
  just selects it and says so, and does not add a duplicate.
- Switching the Gradient switch off uses Color 1 as the solid colour.
- A11y: every control has a label; switch and button targets >= 44 px; no new
  focus traps; works with forced colors (preview swatch gets a `ButtonText` border
  like the others).

## 5. Verification

- Unit tests (`node --test`, existing suite) for `openState`; update tests
  touching renamed labels.
- Playwright (real mouse/keyboard input, `~/.tools/playwright`): mixed-state
  cycle and names for all three states; button visible after scrolling the
  controls on desktop; live background updates on picker/switch/angle input;
  Save adds exactly one swatch, selects it, dedupes; reload restores an unsaved
  and a saved custom background; renamed labels present.
- Screenshots, judged by eye: desktop (controls all open, scrolled), phone
  portrait, phone landscape, all three master-button states, the new Custom block
  in light and dark.
- Re-run the existing a11y checks (aria-expanded on sections, names, 44 px
  targets, focus ring) and confirm no regressions.
