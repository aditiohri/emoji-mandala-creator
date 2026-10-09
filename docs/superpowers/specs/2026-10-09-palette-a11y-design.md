# Palette: buttons, non-drag reorder, fewer tab stops (accessibility slice C)

Status: design settled with the user 2026-10-09 (design chat, six decisions below); not built.
Findings: `docs/a11y-audit-findings.md` (F4, F5, F6, F12, F13 focus-after-remove, F8 chip ×). Device checklist results (iPhone VoiceOver, Samsung TalkBack) were **not** available when this was designed; re-check the palette on devices after the build.
Audit scripts: see auto-memory `browser-testing-setup` (`~/.tools/playwright/a11y/`: `a1-axe`, `a3-kbd`, `a4-touch`, `c1-vsr`, `d-misc`).

## Goal

Everything in the palette works without dragging, with a keyboard, with a touch screen reader and with a finger, using few Tab stops and targets of at least 44 px on touch (24 px minimum everywhere). Meets WCAG 2.5.7 (a single-pointer alternative to dragging), 2.1.1, 2.5.8, 4.1.2 and 4.1.3. No device or OS detection: `pointer: coarse` in CSS is the only capability check, and the toolbar is the accessible path on every device.

## Design (decided)

### 1. Quick add (F4)

- Each of the 40 emoji becomes `<button type="button" class="emoji-chip">` with `aria-pressed` = in the palette. The visible emoji is the accessible name. Behaviour unchanged: pressing an emoji already in the palette removes its newest copy (never below 1 emoji); otherwise it adds one and calls `recordUse`.
- `#emojiGrid` gets `role="group"` and `aria-label="Quick add emoji"`.
- **One Tab stop** (roving tabindex): the last-focused (or first) button has `tabindex="0"`, the rest `-1`. ←/→ move one, ↑/↓ move by the column count (read from the computed `grid-template-columns`), Home/End first/last. Enter and Space toggle (native button).
- Pressing a button must not re-render the grid or lose focus.

### 2. Palette chips (F5, F6, F12, F8 chip ×)

- `#paletteChips` becomes `role="group"` with `aria-label="Your palette"`; each chip is one `<button type="button" class="palette-chip">` (no inner × button, no `role=listitem`). Name: `"🌸, position 3 of 8"` (distinguishes duplicates; no "arrow keys to move"). Selected chip: `aria-pressed="true"`.
- **One Tab stop** for the row (roving tabindex). ←/→ move focus (no wrap), Home/End first/last. **Shift+←/→ moves the focused chip** one place; focus stays on it and the status line says `🌸 moved to position 2 of 8`. **Delete or Backspace removes the focused chip** (same rules as Remove below).
- **Select, then a shared toolbar.** Enter, Space or a tap selects the chip (a second press or Escape deselects). Only one chip is selected at a time. While one is selected, a toolbar appears right under the row (above the cue):
  ```
  [🌸] [🌊] [🔥*] [⭐] [🌙]          * = selected (ringed)
  🔥 position 3 of 5:  [◀ Earlier] [Later ▶] [✕ Remove]
  ```
  `role="toolbar"`, `aria-label="Edit selected emoji"`, three `<button>`s, a visible text label showing the selected emoji and position. The toolbar buttons are tabbable in order after the row. It is `hidden` when nothing is selected.
- **Earlier / Later** move the selected chip by one place (they ignore row wrapping, so cross-row moves work). Selection and **focus stay on the button just pressed** so repeated presses work. At the first (last) position Earlier (Later) gets `aria-disabled="true"` and does nothing (stays focusable; a `disabled` button would drop out of the tab order and strand focus). Status after each move: `🔥 moved to position 2 of 5`.
- **Remove / Delete key** (decision 5): the chip is deleted, selection is cleared, the toolbar hides, and **focus lands on the chip now at the same index, or on the new last chip if the removed one was last**. Status: `🔥 removed, 4 emoji left`. With only 1 emoji left, Remove stays focusable with `aria-disabled="true"` and pressing it (or Delete) announces `Can't remove your last emoji` and changes nothing. Quick add's "remove if present" keeps its existing never-below-1 rule.
- **No × on chips** (decision 6). A mouse user clicks a chip, then Remove; Delete is a keyboard shortcut. No hover-only ×.
- **Drag stays as is** (decision 4): mouse drag and same-row touch drag keep working (`touch-action: pan-y` unchanged). A drag must not also select (swallow the click that follows a drag). Cross-row touch drag is **not** in this slice (see ROADMAP, own slice later).
- Re-rendering from outside (saved palette load, Quick add, typed emoji) clears the selection and hides the toolbar; it must not move focus away from where the person is working.
- **Status line:** one new `<p class="sr-only" id="paletteStatus" role="status">` inside the palette field, written for moves, removals and "can't remove". Do not reuse `#paletteCue` (it keeps announcing the used-emoji counts).
- **Cue text** (F6): `… is using 4 of your 9 emoji — move one earlier to use it` (the "drag" wording is gone). Update the `cueText` unit test.

### 3. Touch targets and look (F8)

- Chips and toolbar buttons: at least 24 px in both dimensions everywhere; at least **44 px** tall under `@media (pointer: coarse)` (the chip may stay pill-shaped; width follows content but at least 44 px). Quick add buttons are at least 44 px under coarse pointer (as `.emoji-chip` is today). Add these to the existing coarse block; media queries go after the base rules.
- Visible `:focus-visible` rings (`--coral-text`) on chips, toolbar buttons and Quick add. Selected chip: a clear ring or fill that is not colour alone (border plus background). Forced colors: selected chip uses `Highlight` border; `unused` dimming must not be the only cue.
- The `unused` (opacity .4) dimming of unused chips stays, but each unused chip's name does not need extra text (the cue line says how many are used).

## Pure helpers (unit-tested in `tests/palette.test.mjs`)

Add to `js/palette.js` and export: `focusAfterRemove(index, newLength)` (index to focus, or -1 if empty), `rovingNext(i, key, count, cols)` (new index for ArrowLeft/Right/Up/Down/Home/End, clamped, no wrap), and `chipLabel(emoji, i, total)`. `moveItem` and `cueText` already exist.

## Scope fence

May touch: `js/palette.js`, `index.html`, `styles.css`, `tests/palette.test.mjs`; `js/main.js` only if a hook is needed (the exported `renderPaletteChips(onChipChange)` and `updatePaletteCue` signatures should stay, so `savedPalettesUI.js` and `main.js` need no change). Must not touch `js/export.js`, shapes, `draw.js`, `js/savedPalettesUI.js`, or the slice D layout (sticky strip, sections) beyond what C needs. No new dependencies.

## Done criteria (script-checkable, run after the build)

The a11y scripts open fresh contexts with sections closed on phones: use copies with `localStorage["mandala.sections"]` set all-open (see auto-memory "Slice D lessons"). The scripts live outside the repo; update the copies for the new DOM (`#paletteChips .palette-chip` is now the button itself, no inner `span` or ×) and add a `c-palette.mjs` with real input (mouse clicks, `keyboard.press`, CDP touch taps; never JS-set values).

- `node --test tests/*.test.mjs` passes, including the new helper tests and the updated `cueText` test.
- `a1-axe.mjs`: no violations (no `target-size`, none new). Chip × no longer exists.
- `a3-kbd.mjs` / `c-palette.mjs`, keyboard: the chip row is **1** Tab stop and Quick add is **1** Tab stop (was 8 chips x 2 and 40 divs); with a chip selected the toolbar adds exactly 3. ←/→/Home/End move focus; Shift+→ reorders and keeps focus on the chip; Enter selects, Escape deselects; Earlier/Later/Remove work and focus stays on the pressed Earlier/Later button; Remove and Delete land focus per section 2; with 1 emoji left Remove announces and changes nothing; a Quick add button toggles `aria-pressed`, adds/removes, keeps focus.
- `c1-vsr.mjs` / accessibility tree: Quick add buttons have role button, name = emoji, pressed state; chip names read `"X, position n of N"`; `#paletteStatus` text after a move, a removal and a refused removal.
- `a4-touch.mjs`: every palette control is at least 24 px, and at least 44 px under coarse pointer; a touch tap selects a chip; tapping Earlier/Later reorders **across a wrapped row** (with enough chips to wrap on a 390 px phone); same-row touch drag still reorders; a mouse drag still reorders and does not leave a chip selected.
- `d-misc.mjs`: no reflow regressions (320 px and 200% font): chips and toolbar wrap, no horizontal overflow.
- Focus never falls to `<body>` after any palette action (assert `document.activeElement` is inside `#paletteChips`, the toolbar, or `#emojiGrid`).
- Judge screenshots by eye: phone portrait (chips wrapped, a chip selected with the toolbar), landscape, desktop, dark theme, forced colors.
- Check `ps` for hung node/Chromium afterwards; one commit, by file name.

## Stop conditions

If making the chips `<button>`s breaks pointer dragging (pointer capture, click suppression) and a small fix can't restore it, or the roving-tabindex grid fights the slice D layout or scroll padding (a focused button hidden under the sticky strip), write a blocker note in `docs/a11y-audit-findings.md` and stop; do not redesign the interaction. Do not add device or OS detection.

## After the build

Tick the slice C line in `ROADMAP.md` section 4 and the Status section of `docs/a11y-audit-findings.md` (F4, F5, F6, F12, F13 remaining part, F8 chip ×). F5's "vertical drag across rows fails on touch" is closed by the toolbar (WCAG 2.5.7), not by fixing the drag; the long-press cross-row drag is its own later slice.
