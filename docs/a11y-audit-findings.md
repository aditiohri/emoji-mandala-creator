# Mandala a11y audit: automated layers (2026-10-09, audited at commit f74bc71)

Live status below. Re-run the scripts (kept outside the repo in `~/.tools/playwright/a11y/`; see the auto-memory note) to verify a fix. Device-checklist results (`docs/a11y-device-checklist.md`) are not merged yet.

## Status
- DONE slice A (commit 84e0545): F1, F3, F11, F14, F15, F19.
- DONE slice B (commit 6eefc85): F7, F10, F13 focus ring only, F18.
- Slice D (phone layout, spec `docs/superpowers/specs/2026-10-09-phone-layout-design.md`): F2, F8 (all but chip ×), F9, F16, F17.
- Slice C (palette, not designed yet): F4, F5, F6, F12, F13 focus-after-remove, F8 chip ×.
- Later: F20.
Scripts in this dir: a1-axe, a2-tree-kbd, a3-kbd, a4-touch, a5-layout, c1-vsr (virtual SR), d-misc, e-fc. Run: `node X.mjs <app-dir> <out-dir>`.
Layer 2 (real VoiceOver) skipped: Terminal lacked Accessibility permission. Layer 3 (devices) pending user: docs/a11y-device-checklist.md.

## Findings (file ← where the fix lands)
SERIOUS/CRITICAL
- F1 Unnamed controls: #zoom, #rotation, #emojiSize sliders and #centerMode select have no accessible name (`<label>` has no `for`) [index.html]. axe critical x2.
- F2 Phone: mandala is 0% visible whenever any slider is in view (canvas at y=223, sliders y=1580-1856, canvas not sticky on phone) [styles.css, layout].
- F3 Mandala canvas has no role/name/description; changes (shape, sliders, shuffle, toggles, glow, save image) are never announced; only paletteCue changes when counts change [index.html, main.js, draw.js].
- F4 Quick add emoji grid: 40 divs, not focusable, no role/name; VO reads them as bare text, no button semantics [palette.js renderEmojiGrid].
- F5 Chip reorder on touch: vertical drag across wrapped rows fails (touch-action:pan-y makes the page scroll; 0 of 3 tries reordered); same-row drags work. No non-drag reorder besides ArrowLeft/Right on keyboard, which a touch screen-reader user cannot use [palette.js attachReorder, styles.css].
- F6 Chip semantics: role=listitem + tabindex + arrow keys; screen readers announce an item, not an operable control; label says "arrow keys to move" (useless on touch); moving announces nothing; paletteCue says "drag one forward" [palette.js].
- F7 Forced-colors (Windows high contrast): the three switches are completely invisible (pill has no border, forced colors drops its background) [styles.css .slider-pill].
- F8 Touch targets under 24px (WCAG 2.2 AA 2.5.8): chip × 18x18; range inputs 20px tall (thumb ~16); switches 36x20; Custom summary 22; file input 21; custom-swatch ✕ 18x18. Under 44: Save palette 26px tall, emoji-chip 44x32, bg swatches 32x32, selects 38, color 40 [styles.css].
- F9 Sliders on touch (Chromium emulation; confirm on Samsung): a vertical swipe that starts on the track moves the page AND changes the value (rotation 331→180); rotation is 0.96 px/step so exact values are hard; thumb drag and 40px-drift drag work [styles.css, shapeControls.js, main.js bindRange].
- F10 Colour contrast: value readouts (.val coral on cream) 2.48:1 (needs 4.5); Save button text 2.68:1 light and dark [styles.css].
MODERATE
- F11 Slider names include their value ("Rings 6" + value 6; Ring spacing: name "1.0×" but value "100"): no aria-valuetext; double reading [shapeControls.js, main.js].
- F12 Palette is 56 virtual-SR swipes deep before reaching the emoji field; 16 Tab stops for 8 chips (chip + × each); 49 tab stops total [palette.js, index.html].
- F13 × buttons have no visible keyboard focus ring (all:unset, no :focus-visible) [styles.css]; focus after removing a chip via keyboard is lost to <body> [palette.js].
- F14 No headings: only an h1; sections are `<label class="group-label">` with no control (8 labels w/o control). No navigation by heading [index.html].
- F15 Save/Share button label changes ("Rendering…", "Saved ✓") are not announced (no live region); desktop save gives silent download [export.js].
- F16 Reflow/zoom: fine at 320px; with text-spacing override the Browse button overflows (right=329 of 320); at 200% root font the emoji input and Browse overflow the panel (panel clipped) [styles.css .custom-row].
- F17 Landscape phone (844x390): canvas is 560px tall (> viewport); controls start below one full screen [styles.css].
- F18 Reduced motion: no prefers-reduced-motion rule (5 transitions, smooth scrollIntoView) [styles.css, export.js]. Minor.
- F19 Emoji dialog: modal and Esc closes, focus returns to Browse (good), focus starts on Close; dialog has no aria-label/labelledby; third-party picker has axe "incomplete" aria-valid-attr-value (not ours) [index.html].
- F20 Deferred from ROADMAP section 2: saved status note toggles hidden + text in one tick; list-style:none drops list role in Safari; Saved row selector interpolates id; rename input no maxlength.
PASSING (record so we don't re-test): keyboard slider arrows/PageUp/Home/End all work; Tab never traps; dialog traps focus and Esc works; chips move by ←/→ with focus kept; saved palettes rename/delete focus handling good; shape tiles/backgrounds expose aria-pressed; toggles named; focus not obscured on desktop; no horizontal scroll at 320px; viewport allows zoom.
## Same-file groups (for parallel slicing)
- styles.css: F2 F5 F7 F8 F9 F10 F13 F16 F17 F18 (almost everything: serialise or split by region)
- index.html: F1 F3 F12 F14 F19
- js/palette.js: F4 F5 F6 F12 F13
- js/shapeControls.js + js/main.js (bindRange): F9 F11 F3
- js/export.js: F15 F18; js/savedPalettesUI.js: F20
