# Phone layout and touch (accessibility slice D)

Status: design settled with the user 2026-10-09 (screenshot mockups judged by eye); not built.
Findings: `docs/a11y-audit-findings.md` (F2, F8, F9, F16, F17). Audit scripts: see auto-memory `browser-testing-setup` (`~/.tools/playwright/a11y/`: `a1-axe`, `a4-touch`, `a5-layout`, `d-misc`).

## Goal

On a phone the mandala must stay in view while the person adjusts any control, without crowding the screen; controls must be easy to hit by touch.

## Design (decided)

1. **Sticky mandala strip** (phones, `max-width: 860px`): `.stage` is `position: sticky; top: 0` with a solid background and a bottom line. The canvas is about **33vh** square (clamp roughly 160 to 300 px), centred. The header scrolls away normally (the subtitle may be hidden on phones). `html { scroll-padding-top }` equals the strip height so a focused control is never hidden under the strip (WCAG 2.4.11).
2. **Sections open and close one by one.** Group the panel into sections: **Palette** (your palette, emoji field, Browse, saved palettes, quick add), **Shape** (shape strip, the shape's sliders, rotation, emoji size, center, the two switches), **Background** (including Soft glow and Custom). **Actions** (Shuffle, Save/Share, export panel) is always visible and not collapsible. Each section header is a heading containing a real `<button aria-expanded aria-controls>`; the body uses the `hidden` attribute when closed so screen readers skip it. Several sections may be open at once (user chose this).
3. **Show all / Hide all** button on the strip (bottom-right of the mandala). Its label says what it will do ("Hide all controls" / "Show all controls"); with all sections closed the mandala strip may grow (optional; keep simple if not).
4. **Defaults:** desktop (over 860 px): all sections open and the layout is unchanged otherwise. Phone: Shape open, others closed on first visit. Open/closed state is remembered per device in `localStorage` (`mandala.sections`, try/catch like the other keys; works without it).
5. **Landscape phone** (`(orientation: landscape) and (max-height: 500px)`): two columns. The strip is the left column (canvas sized by viewport height, about 90vh), the panel scrolls on the right. Fixes F17 (canvas 560 px tall in a 390 px viewport).

## Touch targets and sliders (F8, F9)

- `@media (pointer: coarse)`: every interactive control at least **44 px** in its smaller dimension (range inputs 44 px tall with a visible 28 px thumb and a thin track; switch rows at least 44 px tall; selects, buttons, `summary`, file input, colour input; background swatches 44 px). Nothing under 24 px anywhere (WCAG 2.5.8), including the custom-swatch remove badge (hit area at least 24 px, inside the swatch corner).
- Palette chips and their × are **slice C**, not this slice.
- **Slider swipe (F9):** a vertical swipe that starts on a slider must scroll the page and leave the value unchanged; a horizontal drag moves it. Try `touch-action: pan-y` on ranges first; the audit saw the value jump on touch-start in Chromium emulation, so verify with `a4-touch.mjs` and, if CSS alone does not stop it, handle it in JS. Do not change tap-on-track behaviour beyond what is needed.
- Reflow (F16): at 320 px with WCAG text-spacing overrides and at 200% root font the emoji field plus Browse must not overflow (`.custom-row` wraps, `min-width: 0` on the input).

## Accessibility of the new controls

Section buttons and Show/Hide all are keyboard operable (Enter, Space), have visible focus rings (`--coral-text`), and keep focus on themselves when toggled. A closed section's controls leave the tab order and the accessibility tree. Add `prefers-reduced-motion` safe transitions only (none needed).

## Scope fence

May touch: `index.html`, `styles.css`, `js/main.js`, new `js/sections.js` (pure helpers, with a test under `tests/`), `js/shapeControls.js` only if a hook is needed. Must not touch `js/palette.js`, `js/export.js`, `js/savedPalettesUI.js`, shapes, `draw.js`. No new dependencies.

## Done criteria (script-checkable, run after the build)

- `node --test tests/*.test.mjs` all pass.
- `a1-axe.mjs`: no `target-size` violations (chip × excepted), no new violations.
- `a5-layout.mjs`: with the rotation slider scrolled into the centre of a 390x844 phone the canvas is at least 90 percent visible; 320 px wide has no horizontal overflow; landscape 844x390: canvas fits the viewport height.
- `a4-touch.mjs`: every interactive target is at least 24 px (44 px for non-chip controls under coarse pointer); the vertical-swipe-on-slider test leaves the value unchanged and the page scrolls.
- `d-misc.mjs` reflow sections: no clipped Browse or emoji field at the text-spacing and 200% cases.
- Keyboard run (`a3-kbd.mjs`): closed sections are skipped; the tab order is otherwise unchanged.
- Judge screenshots by eye (phone portrait, landscape, desktop, dark theme, forced colors) before committing.

## Stop conditions

If `touch-action` and a small JS handler together cannot stop the swipe changing a slider, or the sticky strip breaks the desktop sticky canvas, write a blocker note in `docs/a11y-audit-findings.md` and stop; do not improvise a new layout.
