# Save palettes — design

**Date:** 2026-10-09. **Status:** decided (design chat 2026-10-09), ready to build.
**Plan:** `docs/superpowers/plans/2026-10-09-save-palettes.md`.

## 1. Goal

The palette is rebuilt from usage counts on every load, so a palette someone
arranged (its order, its duplicates) lasts for the session only. Let people
save the current palette on this device, see their saved palettes in a list,
and load, rename or delete them, with keyboard, mouse and touch all working.

## 2. Decisions (and why)

| Decision | Why |
|---|---|
| **Per-device `localStorage` only.** No sharing, URLs or accounts. | The app is static and serverless. Sharing the image already covers "show someone". |
| **No paid gate.** | Monetization is tabled (ROADMAP §3); nothing to gate against without a server. |
| **Auto-name from the first 3 emoji** (`✨🌸🔥`); a taken name gets ` 2`, ` 3`… | Saving is one tap, no dialog. The first emoji are the ones the mandala shows most. |
| **Rename inline, any time later.** Trimmed, at most 24 characters, empty is rejected (old name kept). A rename to a name another row already has also gets ` 2`. | Names stay short enough for a phone row; unique names keep screen-reader labels ("Load palette X") distinct. The ` 2` rule on rename is an extension of the auto-name rule (flagged for the user). |
| **Delete is immediate, with Undo** in a live note, restoring at the same position. | No confirm dialog to get past; mistakes are one tap to fix. |
| **Saving an identical palette (same emoji, same order) saves nothing**; the note says `Already saved as "<name>".` | Avoids a list of copies. A different order is a different palette (order decides which emoji the mandala uses). |
| **Cap of 20.** When full, the note says so and nothing is saved. | Keeps the list scannable and the stored JSON small. |
| **Newest first.** | The row you just saved appears right under the Save button. |
| **Loading does not call `recordUse`.** | Most-used counts only rise on adds (ROADMAP §2, decided). |
| **Startup palette unchanged** (usage-based). Shuffle doesn't touch the saved list; a shuffled palette can be saved. | Saved palettes are opt-in; nothing about today's behaviour changes. |
| **Loaded palettes keep their full length and duplicates** (always ≥ 1 emoji). | It's the palette as saved. |

Out of scope (follow-ups): overwrite-in-place "Update" of a saved palette;
reordering the saved list; export/import of saved palettes.

## 3. Data format

Key `mandala.savedPalettes`, value a JSON array, newest first:

```json
[{ "id": "lx3k9a1b2c", "name": "✨🌸🔥", "emoji": ["✨","🌸","🔥","🌊","👨‍👩‍👧"] }]
```

- `emoji` is copied as is from `state.palette`: each string is one palette
  entry, so ZWJ sequences and variation selectors (`❄️`, `👨‍👩‍👧`) stay intact. Never
  re-split or join-and-split them.
- `id`: `Date.now()` in base 36 plus 6 random base-36 characters. Only used to
  find rows; never shown.
- **Validated on read.** Bad JSON, a non-array, or a throwing `getItem` → empty
  list. An entry is dropped unless it is an object with a non-empty string `id`
  not seen before, a `name` that is non-empty after trimming (it is re-trimmed
  and capped), and an `emoji` array of ≥ 1 non-empty strings. At most the first
  20 valid entries are kept.

## 4. Module API

`js/savedPalettes.js` — pure, no DOM, unit-tested. `storage` defaults to
`globalThis.localStorage`, resolved inside a `try`.

| Export | Behaviour |
|---|---|
| `STORAGE_KEY`, `MAX_SAVED` (20), `MAX_NAME` (24) | constants |
| `cleanName(name)` | trim, cap at 24 grapheme clusters (`Intl.Segmenter`, so an emoji is never cut in half), trim again; `""` = unusable |
| `parseSaved(raw)` | validation above |
| `loadSaved(storage?)` | list, `[]` on any failure |
| `storeSaved(list, storage?)` | `true` if the write stuck, `false` on a throw (quota) — same contract as `saveCustomBackgrounds` in `main.js` |
| `sameEmoji(a, b)`, `findSame(list, emoji)` | exact order and length |
| `uniqueName(list, base, exceptId?)`, `autoName(list, emoji)` | ` 2`, ` 3`… suffixes |
| `newId()` | id string |
| `addPalette(list, emoji, id?)` | `{ list, status, entry }`; status `"added"` (new entry at the top, emoji copied), `"duplicate"` (entry = existing), `"full"`, `"empty"`. Duplicate is checked before full. |
| `renamePalette(list, id, name)` | `{ list, changed, entry }`; unchanged list when the id is unknown, the cleaned name is empty, or the name is the same |
| `removePalette(list, id)` | `{ list, removed: { entry, index } \| null }` |
| `restorePalette(list, removed)` | new list with the entry back at `min(index, length)`; no-op if its id is present or the list is full |

All functions return new arrays and never mutate their input.

`js/savedPalettesUI.js` — the DOM wiring, one export:
`setupSavedPalettes(onChange)` (main.js passes its `draw`). It keeps the list in
memory (loaded once at startup) and writes through on every change, so a failed
write still leaves the change in place for the session.

## 5. UI behaviour

A new `.field` **directly below the palette field** (chips, cue line, emoji
input and its hint), above "Quick add". (The brief said "under the chips and
the cue line"; putting it between the cue and the emoji input would separate
the chips from their own add field, so it sits after the whole palette group.
Flagged for the user.)

- Header row: `SAVED PALETTES` group label and a **Save palette** button.
- Note (`#savedNote`, `role="status"`, hidden when empty) under the header.
- List (`<ul>` labelled by the header). Each row:
  - a real `<button class="saved-load">` showing the **name** (bold, ellipsis)
    and a dimmed preview of all its emoji (ellipsis, `aria-hidden`);
    accessible name `Load palette <name>`. Click, Enter or Space replaces
    `state.palette` with a copy of the saved emoji, re-renders the chips,
    calls `syncGridActiveStates()`, redraws.
  - **Rename** button (`aria-label="Rename <name>"`): swaps the name button for
    a text field holding the name, selected. Enter or leaving the field saves;
    Escape cancels. Focus returns to that row's Rename button.
  - **✕** button (`aria-label="Delete <name>"`): deletes at once; note
    `Deleted "<name>". [Undo]`. Focus moves to the load button of the row now
    in its place (else the one above, else Save palette). Undo puts it back at
    the same position and focuses its load button.
- Empty-state hint when the list is empty: "No saved palettes yet. Save this
  one to come back to it later on this device."
- Notes: `Saved as "<name>".` · `Already saved as "<name>".` · `You have 20
  saved palettes, the most it keeps. Delete one to save this one.` ·
  `Renamed to "<name>".` · `A name can't be empty, so it stays "<name>".` ·
  quota: `<message> But this device's storage is full, so it won't be there
  after you reload.` (same idea as the background quota note). Every action in
  the block replaces or clears the note; a cleared note also withdraws Undo.
- Re-rendering keeps keyboard focus on the same control of the same row
  (by `data-id`), as `renderBackgroundPresets` does.
- Phone: rows are full width, buttons ≥ 36 px tall, no horizontal scroll.

## 6. Accessibility

Real buttons everywhere (Tab, Enter, Space); visible coral `:focus-visible`
rings; distinct accessible names per row; the note is a polite live region so
"Saved as…", "Deleted… Undo" and the quota warning are announced; the rename
field has `aria-label="New name for <name>"`.

## 7. Edge cases

- **Quota:** `storeSaved` returns `false`; the change stays for the session and
  the note says it won't survive a reload.
- **Corrupted storage:** see §3; never throws, never blocks startup.
- **Duplicates:** same emoji same order → nothing saved, note names it.
  Duplicate emoji *inside* a palette are kept (they are weights).
- **Cap:** 20; duplicate message wins over "full".
- **Undo:** only for the last delete, until the next action in the block.
- **Long names:** capped at 24 graphemes; ellipsis in the row.
- **Emoji clusters:** stored as the exact strings in `state.palette`; the name
  cap counts graphemes.
- **Known minor:** while a rename field is open, clicking a button in another
  row first saves the rename and re-renders, so that click can be lost; click
  again. Acceptable.

## 8. Testing

- **Unit** (`tests/savedPalettes.test.mjs`, `node:test`, fake storage object):
  parse/validate, load/store round-trip with a ZWJ emoji, throwing storage,
  auto-name and suffixes, duplicate, empty, cap, rename (trim, empty, unique,
  cap without splitting an emoji), remove + restore at position. 15 tests;
  suite goes 89 → 104.
- **Browser** (`~/.tools/playwright/sp.mjs`, a copy of `fu2.mjs`'s harness):
  **real** clicks, taps and key presses only (no `.value`/`.click()` from
  `evaluate`; reading `localStorage` to observe is fine, writing it only to
  fill the quota or corrupt the key). Covers: empty state; save + auto-name;
  duplicate save; ` 2` naming; load by click, Enter and Space with redraw and
  unchanged usage counts; rename by keyboard (Tab, Enter, type, Enter), Escape,
  empty, duplicate name, long name, save on blur; delete by keyboard + Undo at
  the same position, focus after delete; Undo withdrawn on next action; cap 20;
  reload persistence; quota with storage filled (session-only, gone after
  reload); corrupted key; phone width with taps (no horizontal scroll, 36 px
  targets). 57 checks; writes 10 screenshots to judge by eye.

## 9. Done when

- `node --test` → 104 pass; `sp.mjs` → `all passed`, exit 0.
- The screenshots look right to the orchestrator (light desktop, dark phone,
  rename field, Undo note, full and quota notes, long name ellipsis).
- ROADMAP §2 Session B ticked.
