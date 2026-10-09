# Save Palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Saved palettes" block under the palette: save the current palette on this device (auto-named from its first 3 emoji), then load, rename or delete (with Undo) saved ones, by mouse, touch or keyboard.

**Base:** branch `worktree-save-palettes` at or after the commit that adds this plan and the spec.

**Architecture:** `js/savedPalettes.js` holds pure list functions plus `localStorage` load/store (unit-tested, no DOM). `js/savedPalettesUI.js` renders the block and wires the buttons; `main.js` calls `setupSavedPalettes(draw)` once. Markup goes in `index.html`, styles in `styles.css`. Nothing else changes: the startup palette, Shuffle and usage counts are untouched.

**Tech Stack:** Plain ES modules, no build step. Tests use `node:test` and `node:assert/strict`, run with `node --test` (Node 24). Browser checks use Playwright at `~/.tools/playwright`.

**Spec:** `docs/superpowers/specs/2026-10-09-save-palettes-design.md`. Read it before starting any task.

**Provenance:** every code block below was run in a scratch copy of the repo before this plan was written: `node --test` passed (104 tests), the Task 1 "expected failure" was observed, and the Task 3 script printed `all passed` (57 `ok` lines) with its screenshots looked at. **If something fails for you, suspect a transcription slip first and report it rather than redesigning.** Tasks give whole files or exact edits; do not "improve" them.

## Global Constraints

- No build step, no framework, no npm dependencies in the repo.
- `js/savedPalettes.js` imports nothing and touches no DOM.
- Run tests with **`node --test`** from the repo root (not `node --test tests/`).
- Saved emoji are the exact strings from `state.palette`; never split or join-and-resplit them.
- Loading a saved palette must **not** call `recordUse`.
- UI checks use **real Playwright clicks, taps and key presses** on visible elements. Never set `.value`/`.checked` or call `el.click()` from `page.evaluate` (reading `localStorage` is fine; writing it only to fill the quota or corrupt the key).
- Shell: use plain separate git commands (no `&&` chains). `ls` is aliased; use `command ls`. macOS has no `timeout`.
- After a Playwright run, check `ps aux | grep -E "[h]eadless|[s]p\.mjs"` in a separate command and kill leftovers.
- Do **not** edit `~/.tools/playwright/fu2.mjs` or `slice6.mjs`.
- Every commit message ends with a blank line and then `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `js/savedPalettes.js` | create | pure list logic, validation, load/store |
| `tests/savedPalettes.test.mjs` | create | 15 unit tests |
| `js/savedPalettesUI.js` | create | the block: render rows, save/load/rename/delete/undo, notes, focus |
| `index.html` | modify | the block's markup, below the palette field |
| `styles.css` | modify | rows, note, rename field |
| `js/main.js` | modify | import and call `setupSavedPalettes(draw)` |
| `~/.tools/playwright/sp.mjs` | create (outside repo) | real-input browser check |
| `ROADMAP.md` | modify | tick Session B |

**Models (keep usage low):** Tasks 1–2 implementers and reviewers **Sonnet** (or Haiku for Task 1; the code is verbatim). Task 3 run by **Sonnet**; screenshot judgement and the final whole-branch review by the orchestrator (**Opus**, one review). Escalate only if a task fails twice.

---

### Task 1: The pure module and its tests

**Files:**
- Create: `tests/savedPalettes.test.mjs`
- Create: `js/savedPalettes.js`

- [ ] **Step 1: Check the base.** Run `node --test`. Expected: `ℹ pass 89`, `ℹ fail 0`.

- [ ] **Step 2: Write the failing test.** Create `tests/savedPalettes.test.mjs` with exactly:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY, MAX_SAVED, MAX_NAME,
  cleanName, parseSaved, loadSaved, storeSaved, findSame,
  autoName, addPalette, renamePalette, removePalette, restorePalette
} from "../js/savedPalettes.js";

function fakeStorage({ throwOnGet = false, throwOnSet = false } = {}) {
  const data = {};
  return {
    data,
    getItem(k) { if (throwOnGet) throw new Error("denied"); return k in data ? data[k] : null; },
    setItem(k, v) { if (throwOnSet) throw new Error("QuotaExceededError"); data[k] = String(v); },
  };
}

const FAMILY = "👨‍👩‍👧"; // one ZWJ cluster, five code points
const P1 = ["✨", "🌸", "🔥", "🌊"];
const P2 = ["🌙", "🍃", "💠"];

test("parseSaved: bad JSON or a non-array is an empty list", () => {
  assert.deepEqual(parseSaved("{not json"), []);
  assert.deepEqual(parseSaved('{"id":"a"}'), []);
  assert.deepEqual(parseSaved("null"), []);
});

test("parseSaved: bad entries and repeated ids are dropped, good ones kept in order", () => {
  const raw = JSON.stringify([
    { id: "a", name: "A", emoji: ["✨"] },
    { id: "b", name: "", emoji: ["✨"] },          // empty name
    { id: "c", name: "C", emoji: [] },             // no emoji
    { id: "d", name: "D", emoji: ["✨", 3] },      // not all strings
    null,
    { id: "a", name: "A again", emoji: ["🌸"] },   // repeated id
    { id: "e", name: "  E  ", emoji: [FAMILY, "🌸"] },
  ]);
  assert.deepEqual(parseSaved(raw), [
    { id: "a", name: "A", emoji: ["✨"] },
    { id: "e", name: "E", emoji: [FAMILY, "🌸"] },
  ]);
});

test("parseSaved: keeps at most MAX_SAVED entries", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: "x" + i, name: "N" + i, emoji: ["✨"] }));
  assert.equal(parseSaved(JSON.stringify(many)).length, MAX_SAVED);
});

test("loadSaved / storeSaved round-trip; ZWJ emoji survive", () => {
  const s = fakeStorage();
  assert.deepEqual(loadSaved(s), []);
  const list = [{ id: "a", name: FAMILY, emoji: [FAMILY, "✨"] }];
  assert.equal(storeSaved(list, s), true);
  assert.ok(STORAGE_KEY in s.data);
  assert.deepEqual(loadSaved(s), list);
});

test("loadSaved is [] when storage throws; storeSaved reports a failed write", () => {
  assert.deepEqual(loadSaved(fakeStorage({ throwOnGet: true })), []);
  const warn = console.warn; console.warn = () => {};
  try { assert.equal(storeSaved([], fakeStorage({ throwOnSet: true })), false); }
  finally { console.warn = warn; }
});

test("addPalette: auto-names from the first three emoji, newest first, copies the array", () => {
  const emoji = [...P1];
  const r = addPalette([], emoji, "id1");
  assert.equal(r.status, "added");
  assert.deepEqual(r.list, [{ id: "id1", name: "✨🌸🔥", emoji: P1 }]);
  emoji.push("🦋");
  assert.deepEqual(r.list[0].emoji, P1);
  const r2 = addPalette(r.list, P2, "id2");
  assert.deepEqual(r2.list.map(p => p.id), ["id2", "id1"]);
  assert.equal(r2.entry.name, "🌙🍃💠");
});

test("addPalette: a short palette is named by what it has; ZWJ clusters stay whole", () => {
  assert.equal(addPalette([], ["🌸"], "a").entry.name, "🌸");
  assert.equal(addPalette([], [FAMILY, "✨", FAMILY, "🔥"], "b").entry.name, FAMILY + "✨" + FAMILY);
});

test("addPalette: same first three emoji -> ' 2', ' 3'", () => {
  let list = addPalette([], P1, "a").list;
  list = addPalette(list, ["✨", "🌸", "🔥"], "b").list;
  list = addPalette(list, ["✨", "🌸", "🔥", "🦋"], "c").list;
  assert.deepEqual(list.map(p => p.name), ["✨🌸🔥 3", "✨🌸🔥 2", "✨🌸🔥"]);
});

test("addPalette: the identical list in the same order saves nothing and names the existing entry", () => {
  const { list } = addPalette([], P1, "a");
  const r = addPalette(list, [...P1], "b");
  assert.equal(r.status, "duplicate");
  assert.equal(r.entry.id, "a");
  assert.equal(r.list, list);
  // A different order is a different palette.
  assert.equal(addPalette(list, ["🌸", "✨", "🔥", "🌊"], "c").status, "added");
});

test("addPalette: empty palette -> 'empty'; full list -> 'full' (a duplicate still says duplicate)", () => {
  assert.equal(addPalette([], [], "a").status, "empty");
  let list = [];
  for (let i = 0; i < MAX_SAVED; i++) list = addPalette(list, ["✨", String(i)], "id" + i).list;
  assert.equal(list.length, MAX_SAVED);
  const r = addPalette(list, ["🌸"], "new");
  assert.equal(r.status, "full");
  assert.equal(r.list, list);
  assert.equal(addPalette(list, ["✨", "0"], "dup").status, "duplicate");
});

test("cleanName: trims and caps at MAX_NAME characters without splitting an emoji", () => {
  assert.equal(cleanName("  hi  "), "hi");
  assert.equal(cleanName("   "), "");
  assert.equal(cleanName("a".repeat(40)).length, MAX_NAME);
  const cut = cleanName(FAMILY.repeat(30));
  assert.equal(cut, FAMILY.repeat(MAX_NAME));
});

test("renamePalette: trims, rejects empty, keeps names unique", () => {
  let list = addPalette([], P1, "a").list;
  list = addPalette(list, P2, "b").list;
  let r = renamePalette(list, "a", "  Sunset  ");
  assert.equal(r.changed, true);
  assert.equal(r.entry.name, "Sunset");
  list = r.list;
  r = renamePalette(list, "a", "   ");
  assert.equal(r.changed, false);
  assert.equal(r.list, list);
  assert.equal(list.find(p => p.id === "a").name, "Sunset");
  r = renamePalette(list, "b", "Sunset");
  assert.equal(r.entry.name, "Sunset 2");
  assert.equal(renamePalette(list, "a", "Sunset").changed, false); // same name, no change
  assert.equal(renamePalette(list, "zzz", "X").changed, false);
});

test("removePalette + restorePalette put it back at the same position", () => {
  let list = [];
  for (const [id, e] of [["c", ["🍃"]], ["b", ["🌸"]], ["a", ["✨"]]]) list = addPalette(list, e, id).list;
  assert.deepEqual(list.map(p => p.id), ["a", "b", "c"]);
  const r = removePalette(list, "b");
  assert.deepEqual(r.list.map(p => p.id), ["a", "c"]);
  assert.deepEqual(r.removed, { entry: list[1], index: 1 });
  assert.deepEqual(restorePalette(r.list, r.removed).map(p => p.id), ["a", "b", "c"]);
  // Restoring twice does nothing; an unknown id removes nothing.
  const back = restorePalette(r.list, r.removed);
  assert.equal(restorePalette(back, r.removed), back);
  assert.equal(removePalette(list, "zzz").removed, null);
});

test("autoName ignores names only when they differ", () => {
  const list = [{ id: "x", name: "✨🌸🔥 2", emoji: ["✨"] }];
  assert.equal(autoName(list, P1), "✨🌸🔥");
});

test("findSame matches exact order and length only", () => {
  const list = addPalette([], P1, "a").list;
  assert.equal(findSame(list, P1).id, "a");
  assert.equal(findSame(list, P1.slice(0, 3)), undefined);
});
```

- [ ] **Step 3: Run it and see it fail.** Run `node --test tests/savedPalettes.test.mjs`. Expected: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../js/savedPalettes.js'` and `ℹ pass 0`.

- [ ] **Step 4: Write the module.** Create `js/savedPalettes.js` with exactly:

```js
// Saved palettes: pure list functions plus localStorage load/store.
// A list is an array of { id, name, emoji } kept in display order (newest first).
// No DOM here; the UI lives in savedPalettesUI.js.

export const STORAGE_KEY = "mandala.savedPalettes";
export const MAX_SAVED = 20;
export const MAX_NAME = 24; // characters as people see them (grapheme clusters)

// Split into user-perceived characters so a cut never breaks a ZWJ emoji.
function graphemes(text) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(s => s.segment);
}

// Trim and cap a name; "" means unusable.
export function cleanName(name) {
  if (typeof name !== "string") return "";
  return graphemes(name.trim()).slice(0, MAX_NAME).join("").trim();
}

function validEntry(e) {
  return !!e && typeof e === "object" &&
    typeof e.id === "string" && e.id !== "" &&
    cleanName(e.name) !== "" &&
    Array.isArray(e.emoji) && e.emoji.length >= 1 &&
    e.emoji.every(x => typeof x === "string" && x !== "");
}

// Stored text -> list. Bad JSON or shape -> []; bad or repeated-id entries are dropped.
export function parseSaved(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const list = [];
  for (const e of data) {
    if (!validEntry(e) || seen.has(e.id)) continue;
    seen.add(e.id);
    list.push({ id: e.id, name: cleanName(e.name), emoji: [...e.emoji] });
    if (list.length >= MAX_SAVED) break;
  }
  return list;
}

export function loadSaved(storage) {
  try {
    const raw = (storage || globalThis.localStorage).getItem(STORAGE_KEY);
    return raw ? parseSaved(raw) : [];
  } catch (e) {
    return [];
  }
}

// Returns whether the write stuck (it throws when the storage quota is full).
export function storeSaved(list, storage) {
  try {
    (storage || globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn("Failed to save palettes:", e);
    return false;
  }
}

export function sameEmoji(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// The saved entry with exactly these emoji in this order, or undefined.
export function findSame(list, emoji) {
  return list.find(p => sameEmoji(p.emoji, emoji));
}

// `base`, or "base 2", "base 3"... whichever no other entry (except `exceptId`) uses.
export function uniqueName(list, base, exceptId) {
  const taken = new Set(list.filter(p => p.id !== exceptId).map(p => p.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const name = `${base} ${n}`;
    if (!taken.has(name)) return name;
  }
}

// Default name: the palette's first three emoji, made unique.
export function autoName(list, emoji) {
  return uniqueName(list, emoji.slice(0, 3).join(""));
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Save `emoji` (copied as is) at the top of the list.
// status: "added" | "duplicate" (entry = the existing one) | "full" | "empty".
export function addPalette(list, emoji, id = newId()) {
  if (!Array.isArray(emoji) || emoji.length === 0) return { list, status: "empty" };
  const same = findSame(list, emoji);
  if (same) return { list, status: "duplicate", entry: same };
  if (list.length >= MAX_SAVED) return { list, status: "full" };
  const entry = { id, name: autoName(list, emoji), emoji: [...emoji] };
  return { list: [entry, ...list], status: "added", entry };
}

// changed is false (list untouched) when the id is unknown or the name is empty after trimming.
export function renamePalette(list, id, name) {
  const entry = list.find(p => p.id === id);
  const clean = cleanName(name);
  if (!entry || clean === "") return { list, changed: false, entry };
  const finalName = uniqueName(list, clean, id);
  if (finalName === entry.name) return { list, changed: false, entry };
  const renamed = { ...entry, name: finalName };
  return { list: list.map(p => (p.id === id ? renamed : p)), changed: true, entry: renamed };
}

// removed = { entry, index } for undo, or null if the id is unknown.
export function removePalette(list, id) {
  const index = list.findIndex(p => p.id === id);
  if (index < 0) return { list, removed: null };
  return { list: list.filter(p => p.id !== id), removed: { entry: list[index], index } };
}

// Put a removed entry back where it was. No-op if it is already there or the list is full.
export function restorePalette(list, removed) {
  if (!removed || list.some(p => p.id === removed.entry.id) || list.length >= MAX_SAVED) return list;
  const next = [...list];
  next.splice(Math.min(removed.index, next.length), 0, removed.entry);
  return next;
}
```

- [ ] **Step 5: Run the tests.** `node --test tests/savedPalettes.test.mjs` → `ℹ pass 15`, `ℹ fail 0`. Then `node --test` → `ℹ pass 104`, `ℹ fail 0`.

- [ ] **Step 6: Commit.**

```bash
git add js/savedPalettes.js tests/savedPalettes.test.mjs
git commit -m "Saved palettes: pure list module (validate, auto-name, duplicates, cap, rename, delete/undo) with tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The Saved palettes block (UI, markup, styles, wiring)

**Files:**
- Create: `js/savedPalettesUI.js`
- Modify: `index.html` (after the palette `.field`, before `<dialog id="emojiDialog">`)
- Modify: `styles.css` (after `.palette-cue{ margin:6px 0 0; }`)
- Modify: `js/main.js` (imports; after `setupCustomEmojiInput(draw);`)

- [ ] **Step 1: Create `js/savedPalettesUI.js`** with exactly:

```js
// "Saved palettes" block: save, load, rename, delete (with undo). The list logic is in savedPalettes.js.
import { state } from "./state.js";
import { renderPaletteChips, syncGridActiveStates } from "./palette.js";
import {
  MAX_SAVED, loadSaved, storeSaved, addPalette,
  renamePalette, removePalette, restorePalette
} from "./savedPalettes.js";

const FULL_STORAGE = "this device's storage is full, so it won't be there after you reload.";

let list = [];
let lastRemoved = null; // { entry, index } of the last delete, while its Undo is offered
let redraw = () => {};

// One note under the Save button. `undo` adds an Undo button. "" hides it.
function showNote(message, undo = false) {
  const note = document.getElementById("savedNote");
  note.textContent = message;
  if (undo) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost small saved-undo";
    btn.textContent = "Undo";
    btn.addEventListener("click", undoDelete);
    note.append(" ", btn);
  }
  note.hidden = !message;
  if (!undo) lastRemoved = null;
}

// Write the list; a failed write keeps it for this session and says so.
function persist(okMessage) {
  const stored = storeSaved(list);
  showNote(stored ? okMessage : `${okMessage ? okMessage + " But" : "This change is kept for now, but"} ${FULL_STORAGE}`);
  return stored;
}

// Rebuild the rows. `focus` = { id, part } names the control to focus afterwards
// (part: "load" | "rename" | "delete"); by default the focused control keeps focus.
function renderList(focus) {
  const ul = document.getElementById("savedList");
  if (!focus && ul.contains(document.activeElement)) {
    const row = document.activeElement.closest(".saved-row");
    const part = ["load", "rename", "delete"].find(p => document.activeElement.classList.contains("saved-" + p));
    if (row && part) focus = { id: row.dataset.id, part };
  }
  ul.innerHTML = "";
  for (const p of list) {
    const li = document.createElement("li");
    li.className = "saved-row";
    li.dataset.id = p.id;

    const load = document.createElement("button");
    load.type = "button";
    load.className = "saved-load";
    load.setAttribute("aria-label", `Load palette ${p.name}`);
    const name = document.createElement("span");
    name.className = "saved-name";
    name.textContent = p.name;
    const preview = document.createElement("span");
    preview.className = "saved-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.textContent = p.emoji.join("");
    load.append(name, preview);
    load.addEventListener("click", () => loadPalette(p.id));

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "btn ghost small saved-rename";
    rename.textContent = "Rename";
    rename.setAttribute("aria-label", `Rename ${p.name}`);
    rename.addEventListener("click", () => startRename(p.id));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn ghost small saved-delete";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete ${p.name}`);
    del.addEventListener("click", () => deletePalette(p.id));

    li.append(load, rename, del);
    ul.appendChild(li);
  }
  document.getElementById("savedEmpty").hidden = list.length > 0;
  if (focus) ul.querySelector(`.saved-row[data-id="${focus.id}"] .saved-${focus.part}`)?.focus();
}

function savePalette() {
  const r = addPalette(list, state.palette);
  if (r.status === "duplicate") return showNote(`Already saved as "${r.entry.name}".`);
  if (r.status === "full") return showNote(`You have ${MAX_SAVED} saved palettes, the most it keeps. Delete one to save this one.`);
  if (r.status !== "added") return showNote("");
  list = r.list;
  persist(`Saved as "${r.entry.name}".`);
  renderList();
}

function loadPalette(id) {
  showNote("");
  const p = list.find(x => x.id === id);
  if (!p) return;
  // Not recordUse: most-used counts only rise when emoji are added.
  state.palette = [...p.emoji];
  renderPaletteChips(redraw);
  syncGridActiveStates();
  redraw();
}

function deletePalette(id) {
  const r = removePalette(list, id);
  if (!r.removed) return;
  list = r.list;
  const stored = storeSaved(list);
  // Keep keyboard focus nearby: the row now in its place, else the one above, else Save.
  const next = list[Math.min(r.removed.index, list.length - 1)];
  renderList(next ? { id: next.id, part: "load" } : undefined);
  if (!next) document.getElementById("savePalette").focus();
  showNote(`Deleted "${r.removed.entry.name}".${stored ? "" : " This change is kept for now, but " + FULL_STORAGE}`, true);
  lastRemoved = r.removed;
}

function undoDelete() {
  if (!lastRemoved) return;
  const entry = lastRemoved.entry;
  list = restorePalette(list, lastRemoved);
  persist("");
  renderList({ id: entry.id, part: "load" });
}

// Swap the row's name button for a text field. Enter or leaving the field saves; Escape cancels.
function startRename(id) {
  showNote("");
  const row = document.querySelector(`#savedList .saved-row[data-id="${id}"]`);
  const p = list.find(x => x.id === id);
  if (!row || !p) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "saved-input";
  input.value = p.name;
  input.setAttribute("aria-label", `New name for ${p.name}`);
  row.querySelector(".saved-load").replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    if (commit) {
      const r = renamePalette(list, id, input.value);
      if (r.changed) {
        list = r.list;
        persist(`Renamed to "${r.entry.name}".`);
      } else if (input.value.trim() === "") {
        showNote(`A name can't be empty, so it stays "${p.name}".`);
      }
    }
    renderList({ id, part: "rename" });
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
}

// onChange redraws the mandala (main.js passes its draw()).
export function setupSavedPalettes(onChange) {
  redraw = onChange;
  list = loadSaved();
  document.getElementById("savePalette").addEventListener("click", savePalette);
  renderList();
}
```

- [ ] **Step 2: `index.html`.** Find:

```html
        <p class="hint">Emoji you type or paste are added automatically. On phone, tap the field to bring up your emoji keyboard; on Mac, try Cmd+Ctrl+Space. Or browse the full library.</p>
      </div>
```

and replace it with:

```html
        <p class="hint">Emoji you type or paste are added automatically. On phone, tap the field to bring up your emoji keyboard; on Mac, try Cmd+Ctrl+Space. Or browse the full library.</p>
      </div>

      <div class="field saved-palettes">
        <div class="saved-head">
          <span class="group-label" id="savedLabel">Saved palettes</span>
          <button class="btn small" id="savePalette" type="button">Save palette</button>
        </div>
        <p class="saved-note" id="savedNote" role="status" hidden></p>
        <ul class="saved-list" id="savedList" aria-labelledby="savedLabel"></ul>
        <p class="hint" id="savedEmpty">No saved palettes yet. Save this one to come back to it later on this device.</p>
      </div>
```

- [ ] **Step 3: `styles.css`.** Find the line `.palette-cue{ margin:6px 0 0; }` and replace it with:

```css
.palette-cue{ margin:6px 0 0; }

.saved-head{ display:flex; justify-content:space-between; align-items:center; gap:8px; }
.saved-note{ margin:0; font-size:0.8rem; color:var(--text-dim); }
.saved-note .saved-undo{ margin-left:4px; }
.saved-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
.saved-list:empty{ display:none; }
.saved-row{ display:flex; align-items:center; gap:6px; min-width:0; }
.saved-load, .saved-input{
  flex:1;
  min-width:0;
  min-height:36px;
  box-sizing:border-box;
  border-radius:8px;
  border:1px solid var(--line);
  background:var(--paper-2);
  color:var(--text);
  font-family:inherit;
  font-size:0.9rem;
}
.saved-load{
  display:flex;
  align-items:center;
  gap:10px;
  padding:6px 10px;
  text-align:left;
  cursor:pointer;
}
.saved-load:hover{ border-color:var(--coral); }
.saved-input{ padding:6px 10px; }
.saved-name{ flex:none; max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; }
.saved-preview{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.7; }
.saved-load:focus-visible, .saved-input:focus-visible,
.saved-row .btn:focus-visible, .saved-head .btn:focus-visible, .saved-undo:focus-visible{ outline:2px solid var(--coral); outline-offset:2px; }
.saved-row .btn{ flex:none; min-height:36px; }
```

- [ ] **Step 4: `js/main.js`.** Find `import { addedNote } from "./addnote.js";` and replace it with:

```js
import { addedNote } from "./addnote.js";
import { setupSavedPalettes } from "./savedPalettesUI.js";
```

Then find:

```js
renderEmojiGrid(draw);
setupCustomEmojiInput(draw);
```

and replace it with:

```js
renderEmojiGrid(draw);
setupCustomEmojiInput(draw);
setupSavedPalettes(draw);
```

- [ ] **Step 5: Check.** `node --test` → `ℹ pass 104`, `ℹ fail 0` (the UI has no unit tests; Task 3 checks it in a browser). Quick smoke: `cd ~/.tools/playwright` then `node check.mjs <worktree> <scratchpad>/smoke.png`; expect no console errors, and look at the PNG: the "SAVED PALETTES" header with a Save palette button and the empty hint appear under the palette.

- [ ] **Step 6: Commit.**

```bash
git add js/savedPalettesUI.js index.html styles.css js/main.js
git commit -m "Saved palettes block: save, load, rename inline, delete with undo; notes for duplicates, cap and full storage

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Browser check with real input (`sp.mjs`)

**Files:** Create `~/.tools/playwright/sp.mjs` (outside the repo; not committed).

- [ ] **Step 1:** `cp ~/.tools/playwright/fu2.mjs ~/.tools/playwright/sp.mjs` (same harness: static server, `ok()`, Chromium), then replace the **whole** content of `sp.mjs` with exactly:

```js
// usage: node sp.mjs <app-dir> <out-dir>  -- Save palettes: real clicks, taps and key presses
import { chromium } from "playwright";
import http from "http"; import fs from "fs"; import path from "path";
const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]);
fs.mkdirSync(out, { recursive: true });
const T = {".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/json"};
const srv = http.createServer((q, r) => { const p = path.join(dir, q.url === "/" ? "index.html" : q.url.split("?")[0]);
  fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": T[path.extname(p)] || "application/octet-stream" }); r.end(d); }); }).listen(0);
let fails = 0; const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fails++; };
const URL = () => `http://localhost:${srv.address().port}/`;
const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: "light" });
  const pg = await ctx.newPage(); pg.on("pageerror", e => { console.log("ERR", e.message); fails++; });
  await pg.goto(URL()); await pg.waitForTimeout(600);
  const px = () => pg.evaluate(() => document.getElementById("canvas").toDataURL());
  const chips = () => pg.$$eval("#paletteChips .palette-chip > span", s => s.map(x => x.textContent));
  const names = () => pg.$$eval("#savedList .saved-name", s => s.map(x => x.textContent));
  const stored = () => pg.evaluate(() => JSON.parse(localStorage.getItem("mandala.savedPalettes") || "[]"));
  const usage = () => pg.evaluate(() => localStorage.getItem("mandala.emojiUsage"));
  const note = pg.locator("#savedNote");
  const save = pg.locator("#savePalette");
  const block = pg.locator(".saved-palettes");
  const rows = pg.locator("#savedList .saved-row");
  const row = i => rows.nth(i);
  const addFromGrid = async () => { await pg.locator("#emojiGrid .emoji-chip:not(.active)").first().click(); await pg.waitForTimeout(50); };
  const focusedClass = () => pg.evaluate(() => document.activeElement.className);
  const focusedRowIdx = () => pg.evaluate(() => [...document.querySelectorAll("#savedList .saved-row")].indexOf(document.activeElement.closest(".saved-row")));

  // 1. empty state
  ok(await rows.count() === 0, "no saved palettes at first");
  ok(await pg.locator("#savedEmpty").isVisible(), "empty hint visible");
  ok(!(await note.isVisible()), "no note at first");
  await block.screenshot({ path: path.join(out, "1-empty.png") });

  // 2. save + auto-name
  const first = await chips();
  await save.click(); await pg.waitForTimeout(100);
  ok(await rows.count() === 1, "Save adds a row");
  ok((await names())[0] === first.slice(0, 3).join(""), "auto-named from the first 3 emoji: " + (await names())[0]);
  ok((await note.textContent()).includes("Saved as"), "note: " + await note.textContent());
  ok(!(await pg.locator("#savedEmpty").isVisible()), "empty hint hidden");
  ok(JSON.stringify((await stored())[0].emoji) === JSON.stringify(first), "stored emoji match the palette");

  // 3. duplicate save
  await save.click(); await pg.waitForTimeout(100);
  ok(await rows.count() === 1, "identical palette saves nothing");
  ok((await note.textContent()).includes(`Already saved as "${first.slice(0, 3).join("")}"`), "note: " + await note.textContent());

  // 4. a changed palette (one emoji added, then the first chip moved right by keyboard) saves as a second row, newest first
  await addFromGrid();
  await save.click(); await pg.waitForTimeout(100);
  ok(JSON.stringify(await names()) === JSON.stringify([first.slice(0, 3).join("") + " 2", first.slice(0, 3).join("")]), "same first 3 emoji -> ' 2': " + JSON.stringify(await names()));
  await row(0).locator(".saved-delete").click(); await pg.waitForTimeout(50);
  await pg.locator("#paletteChips .palette-chip").first().focus(); await pg.keyboard.press("ArrowRight"); await pg.waitForTimeout(50);
  const second = await chips();
  ok(second[0] === first[1] && second[1] === first[0], "chip moved by keyboard");
  await save.click(); await pg.waitForTimeout(100);
  ok(await rows.count() === 2, "second palette saved");
  ok(JSON.stringify(await names()) === JSON.stringify([second.slice(0, 3).join(""), first.slice(0, 3).join("")]), "names: " + JSON.stringify(await names()));
  await block.screenshot({ path: path.join(out, "2-two-saved.png") });

  // 5. load by click (older row) and by keyboard (Enter, then Space)
  const usageBefore = await usage();
  let before = await px();
  await row(1).locator(".saved-load").click(); await pg.waitForTimeout(150);
  ok(JSON.stringify(await chips()) === JSON.stringify(first), "click loads the older palette");
  ok(await px() !== before, "canvas redrew");
  ok(!(await note.isVisible()), "note cleared by the next action");
  ok(await usage() === usageBefore, "loading does not touch usage counts");
  const activeGrid = await pg.$$eval("#emojiGrid .emoji-chip.active", s => s.map(x => x.textContent));
  ok(activeGrid.every(e => first.includes(e)) && activeGrid.length === new Set(first.filter(e => activeGrid.includes(e))).size, "grid active states synced");
  await row(0).locator(".saved-load").focus(); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok(JSON.stringify(await chips()) === JSON.stringify(second), "Enter loads the newer palette");
  await row(1).locator(".saved-load").focus(); await pg.keyboard.press("Space"); await pg.waitForTimeout(100);
  ok(JSON.stringify(await chips()) === JSON.stringify(first), "Space loads the older palette");

  // 6. rename by keyboard: Tab from the name to Rename, Enter, type, Enter
  await row(0).locator(".saved-load").focus(); await pg.keyboard.press("Tab");
  ok((await focusedClass()).includes("saved-rename"), "Tab reaches Rename");
  await pg.keyboard.press("Enter");
  ok((await focusedClass()).includes("saved-input"), "rename field focused");
  await block.screenshot({ path: path.join(out, "3-renaming.png") });
  await pg.keyboard.type("Sunset"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok((await names())[0] === "Sunset", "renamed: " + (await names())[0]);
  ok((await focusedClass()).includes("saved-rename") && await focusedRowIdx() === 0, "focus back on that row's Rename");
  ok((await stored())[0].name === "Sunset", "rename stored");
  ok(await row(0).locator(".saved-load").getAttribute("aria-label") === "Load palette Sunset", "accessible name follows the rename");
  // Escape cancels
  await pg.keyboard.press("Enter"); await pg.keyboard.type("Nope"); await pg.keyboard.press("Escape"); await pg.waitForTimeout(100);
  ok((await names())[0] === "Sunset", "Escape keeps the old name");
  // empty is rejected
  await pg.keyboard.press("Enter"); await pg.keyboard.press("Backspace"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok((await names())[0] === "Sunset", "empty name rejected");
  ok((await note.textContent()).includes("can't be empty"), "note: " + await note.textContent());
  // same name as another row gets " 2"
  await row(1).locator(".saved-rename").click(); await pg.keyboard.type("Sunset"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok((await names())[1] === "Sunset 2", "duplicate name gets ' 2': " + (await names())[1]);
  // long name is capped at 24
  await row(1).locator(".saved-rename").click(); await pg.keyboard.type("A very long palette name that keeps going"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok([...(await names())[1]].length === 24, "long name capped at 24: " + (await names())[1]);
  // clicking away saves the rename
  await row(1).locator(".saved-rename").click(); await pg.keyboard.type("Blur name"); await pg.locator("#savedLabel").click(); await pg.waitForTimeout(100);
  ok((await names())[1] === "Blur name", "leaving the field saves: " + (await names())[1]);
  await block.screenshot({ path: path.join(out, "4-renamed.png") });

  // 7. delete + undo at the same position (three rows, delete the middle one)
  await addFromGrid(); await addFromGrid(); await save.click(); await pg.waitForTimeout(100);
  const three = await names();
  ok(three.length === 3, "three rows: " + JSON.stringify(three));
  await row(1).locator(".saved-delete").focus(); await pg.keyboard.press("Enter"); await pg.waitForTimeout(100);
  ok(await rows.count() === 2, "Delete removes the row at once");
  ok((await stored()).length === 2, "delete stored");
  ok((await note.textContent()).includes(`Deleted "${three[1]}"`), "note: " + await note.textContent());
  ok((await focusedClass()).includes("saved-load") && await focusedRowIdx() === 1, "focus moves to the row now in its place");
  await block.screenshot({ path: path.join(out, "5-deleted-undo.png") });
  await pg.locator("#savedNote .saved-undo").click(); await pg.waitForTimeout(100);
  ok(JSON.stringify(await names()) === JSON.stringify(three), "Undo restores it at the same position");
  ok((await stored()).length === 3, "undo stored");
  ok(!(await note.isVisible()), "note gone after Undo");
  // Undo goes away on the next action
  await row(2).locator(".saved-delete").click(); await pg.waitForTimeout(50);
  ok(await pg.locator("#savedNote .saved-undo").isVisible(), "Undo offered");
  await row(0).locator(".saved-load").click(); await pg.waitForTimeout(50);
  ok(!(await note.isVisible()), "note cleared by the next action");
  ok(await rows.count() === 2, "row stays deleted");

  // 8. cap of 20
  while (await rows.count() < 20) { await addFromGrid(); await save.click(); await pg.waitForTimeout(30); }
  ok(await rows.count() === 20, "20 saved");
  await addFromGrid(); await save.click(); await pg.waitForTimeout(100);
  ok(await rows.count() === 20, "21st not saved");
  ok((await note.textContent()).includes("20 saved palettes"), "note: " + await note.textContent());
  await block.screenshot({ path: path.join(out, "6-full.png") });

  // 9. reload persistence
  const twenty = await names();
  await pg.reload(); await pg.waitForTimeout(600);
  ok(JSON.stringify(await names()) === JSON.stringify(twenty), "same 20 after reload, same order");
  ok(!(await note.isVisible()), "no note after reload");

  // 10. quota: storage filled, a new save stays for the session with a note, gone after reload
  await row(0).locator(".saved-delete").click(); await pg.waitForTimeout(50);
  await pg.evaluate(() => {
    for (const size of [1 << 20, 1000, 100, 10, 1]) {
      const s = "x".repeat(size); let i = 0;
      try { for (;; i++) localStorage.setItem("fill" + size + "_" + i, s); } catch (e) {}
    }
  });
  await addFromGrid(); await save.click(); await pg.waitForTimeout(100);
  ok(await rows.count() === 20, "saved for this session");
  ok((await note.textContent()).includes("won't be there after you reload"), "note: " + await note.textContent());
  await block.screenshot({ path: path.join(out, "7-quota.png") });
  await pg.evaluate(() => { Object.keys(localStorage).filter(k => k.startsWith("fill")).forEach(k => localStorage.removeItem(k)); });
  await pg.reload(); await pg.waitForTimeout(600);
  ok(await rows.count() === 19, "after reload the unsaved one is gone: " + await rows.count());

  // 11. corrupted storage is treated as empty
  await pg.evaluate(() => localStorage.setItem("mandala.savedPalettes", "{oops"));
  await pg.reload(); await pg.waitForTimeout(600);
  ok(await rows.count() === 0 && await pg.locator("#savedEmpty").isVisible(), "bad JSON -> empty list, no crash");
  await pg.screenshot({ path: path.join(out, "8-desktop.png"), fullPage: true });

  // 12. phone width, real taps
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
  const pp = await ph.newPage(); pp.on("pageerror", e => { console.log("ERR", e.message); fails++; });
  await pp.goto(URL()); await pp.waitForTimeout(600);
  await pp.locator("#savePalette").tap(); await pp.waitForTimeout(100);
  await pp.locator("#emojiGrid .emoji-chip:not(.active)").first().tap();
  await pp.locator("#savePalette").tap(); await pp.waitForTimeout(100);
  await pp.locator("#savedList .saved-row").nth(0).locator(".saved-rename").tap();
  await pp.keyboard.type("A long name for a phone row"); await pp.keyboard.press("Enter"); await pp.waitForTimeout(100);
  ok(await pp.locator("#savedList .saved-row").count() === 2, "phone: two rows");
  const pChips = () => pp.$$eval("#paletteChips .palette-chip > span", s => s.map(x => x.textContent));
  const beforeTap = await pChips();
  await pp.locator("#savedList .saved-row").nth(1).locator(".saved-load").tap(); await pp.waitForTimeout(100);
  ok(JSON.stringify(await pChips()) !== JSON.stringify(beforeTap), "phone: tap loads");
  const noScroll = await pp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(noScroll, "phone: no horizontal scroll");
  const heights = await pp.$$eval("#savedList button", s => s.map(x => x.getBoundingClientRect().height));
  ok(heights.every(h => h >= 36), "phone: row buttons at least 36px tall: " + JSON.stringify(heights));
  await pp.locator(".saved-palettes").scrollIntoViewIfNeeded();
  await pp.locator(".saved-palettes").screenshot({ path: path.join(out, "9-phone-block.png") });
  await pp.screenshot({ path: path.join(out, "10-phone.png") });
} finally { await b.close(); srv.close(); }
console.log(fails ? `${fails} FAILED` : "all passed");
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run.** `cd ~/.tools/playwright` then `node sp.mjs <worktree> <scratchpad>/sp` (about 30 s). Expected: 57 lines starting `ok`, no `FAIL`, no `ERR`, last line `all passed`, exit 0. Then, in a separate command, `ps aux | grep -E "[h]eadless|[s]p\.mjs"` → nothing.

- [ ] **Step 3: Screenshots (orchestrator judges by eye).** `<scratchpad>/sp/`: `1-empty.png` (header, button, hint), `2-two-saved.png`, `3-renaming.png` (field with the name selected, coral ring), `4-renamed.png` (long name cut with an ellipsis), `5-deleted-undo.png` (note with Undo button), `6-full.png` (20 rows, full note), `7-quota.png` (storage-full note), `8-desktop.png` (whole page; the block sits between the palette and Quick add), `9-phone-block.png` and `10-phone.png` (dark, 390 px: rows fit, Rename and ✕ visible, no overflow). Report anything that looks off; do not change the design to fix it without asking.

No commit (the script lives outside the repo).

---

### Task 4: ROADMAP tick (orchestrator)

- [ ] **Step 1:** In `ROADMAP.md` §2, replace the Session B item (the `- [ ] **Session B, save palettes (NEXT):** …` bullet, 4 lines) with:

```markdown
- [x] **Session B, save palettes** (done 2026-10-09, branch
  `worktree-save-palettes`): per-device `localStorage` (`mandala.savedPalettes`),
  auto-named from the first 3 emoji, load / rename inline / delete with Undo,
  cap 20, quota and corrupted-storage handling, no paid gate. Spec
  `docs/superpowers/specs/2026-10-09-save-palettes-design.md`. Checked by
  `~/.tools/playwright/sp.mjs` (57 real-input checks) and 104 unit tests.
  Follow-ups: "Update" a saved palette in place, reorder the saved list,
  export/import.
```

and delete the "Still open:" bullet **New idea: save palettes (maybe a paid feature).** (3 lines) and the `Still open:` line above it if nothing else is left under it.

- [ ] **Step 2:** `node --test` → `ℹ pass 104`. Commit:

```bash
git add ROADMAP.md
git commit -m "ROADMAP: save palettes done

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3:** Whole-branch review (one Opus reviewer) against the spec; fix findings; re-run `node --test` and `sp.mjs`. Do not push or merge without the user's go-ahead.
