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
