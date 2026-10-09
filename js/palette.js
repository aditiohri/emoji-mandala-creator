import { state, PICKER_EMOJI } from "./state.js";
import { recordUse } from "./usage.js";

export function splitEmojiClusters(val){
  const chars = Array.from(val);
  const clusters = [];
  let i = 0;
  while (i < chars.length){
    let cluster = chars[i];
    if (chars[i+1] === "‍" || (chars[i+1] && chars[i+1].codePointAt(0) === 0xFE0F)){
      cluster += chars[i+1]; i++;
    }
    clusters.push(cluster);
    i++;
  }
  return clusters;
}

export function syncGridActiveStates(){
  document.querySelectorAll("#emojiGrid .emoji-chip").forEach(chip => {
    const on = state.palette.includes(chip.textContent);
    chip.classList.toggle("active", on);
    chip.setAttribute("aria-pressed", String(on));
  });
}

// Palette UI state: the selected chip (null = none), the chip that holds the
// row's single Tab stop, and the latest change callback.
let selected = null;
let rover = 0;
let notify = null;
let statusFlip = false;

const chipEls = () => [...document.querySelectorAll("#paletteChips .palette-chip")];

// Polite status for moves and removals. Alternating a trailing nbsp makes a
// repeated message announce again.
function say(text){
  const el = document.getElementById("paletteStatus");
  if (!el) return;
  statusFlip = !statusFlip;
  el.textContent = text + (statusFlip ? "\u00a0" : "");
}

function changed(){ if (notify) notify(); }

function focusChip(i, opts){
  const chips = chipEls();
  if (i < 0 || !chips.length) return;
  chips[Math.min(i, chips.length - 1)].focus(opts);
}

function setRover(i){
  rover = i;
  chipEls().forEach((c, j) => { c.tabIndex = j === i ? 0 : -1; });
}

// Show or hide the toolbar for the selected chip and sync aria-pressed.
function updateToolbar(){
  const bar = document.getElementById("paletteToolbar");
  const n = state.palette.length;
  chipEls().forEach((c, j) => c.setAttribute("aria-pressed", String(j === selected)));
  if (!bar) return;
  bar.hidden = selected === null;
  if (selected === null) return;
  document.getElementById("paletteToolbarLabel").textContent =
    `${state.palette[selected]} position ${selected + 1} of ${n}:`;
  document.getElementById("paletteEarlier").setAttribute("aria-disabled", String(selected === 0));
  document.getElementById("paletteLater").setAttribute("aria-disabled", String(selected === n - 1));
  document.getElementById("paletteRemove").setAttribute("aria-disabled", String(n <= 1));
}

function select(i){
  selected = selected === i ? null : i;
  updateToolbar();
}

// Where a selected index lands after moveItem(from, to).
function trackSelected(sel, from, to){
  if (sel === null) return null;
  if (sel === from) return to;
  if (from < to && sel > from && sel <= to) return sel - 1;
  if (from > to && sel >= to && sel < from) return sel + 1;
  return sel;
}

// Remove chip i. Returns false (and says why) when it is the last emoji.
function removeChip(i){
  if (state.palette.length <= 1){
    say("Can't remove your last emoji");
    return false;
  }
  const [e] = state.palette.splice(i, 1);
  selected = null;
  buildChips();
  syncGridActiveStates();
  const next = focusAfterRemove(i, state.palette.length);
  setRover(next);
  focusChip(next);
  say(`${e} removed, ${state.palette.length} emoji left`);
  changed();
  return true;
}

// Move chip `from` to `to`; the caller says where focus goes afterwards.
function moveChip(from, to){
  const e = state.palette[from];
  moveItem(state.palette, from, to);
  selected = trackSelected(selected, from, to);
  buildChips();
  say(`${e} moved to position ${to + 1} of ${state.palette.length}`);
  changed();
}

function wireToolbar(){
  const bar = document.getElementById("paletteToolbar");
  if (!bar || bar.dataset.wired) return;
  bar.dataset.wired = "1";
  const act = (id, fn) => document.getElementById(id).addEventListener("click", fn);
  act("paletteEarlier", () => {
    if (selected === null || selected === 0) return;
    const from = selected;
    moveChip(from, from - 1);
    setRover(selected);
  });
  act("paletteLater", () => {
    if (selected === null || selected >= state.palette.length - 1) return;
    const from = selected;
    moveChip(from, from + 1);
    setRover(selected);
  });
  act("paletteRemove", () => { if (selected !== null) removeChip(selected); });
  bar.addEventListener("keydown", e => {
    if (e.key !== "Escape" || selected === null) return;
    e.preventDefault();
    const i = selected;
    selected = null;
    updateToolbar();
    setRover(i);
    focusChip(i);
  });
}

function buildChips(){
  const wrap = document.getElementById("paletteChips");
  wrap.innerHTML = "";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", "Your palette");
  rover = Math.max(0, Math.min(rover, state.palette.length - 1));
  state.palette.forEach((e, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "palette-chip";
    chip.textContent = e;
    chip.tabIndex = i === rover ? 0 : -1;
    chip.setAttribute("aria-label", chipLabel(e, i, state.palette.length));
    attachChip(chip, i);
    wrap.appendChild(chip);
  });
  updateToolbar();
}

export function renderPaletteChips(onChipChange){
  notify = onChipChange;
  wireToolbar();
  // Outside changes (saved palette, Quick add, typed emoji) clear the selection
  // and leave focus where the person is working; a focused chip keeps its slot.
  const wrap = document.getElementById("paletteChips");
  const at = wrap.contains(document.activeElement) ? chipEls().indexOf(document.activeElement) : -1;
  selected = null;
  buildChips();
  if (at >= 0) focusChip(at);
}

// Pure helpers (unit-tested).
export function chipLabel(emoji, i, total){
  return `${emoji}, position ${i + 1} of ${total}`;
}

export function focusAfterRemove(index, newLength){
  return newLength <= 0 ? -1 : Math.min(index, newLength - 1);
}

// New index for a roving-tabindex key; clamped, no wrap.
export function rovingNext(i, key, count, cols){
  const clamp = n => Math.max(0, Math.min(count - 1, n));
  switch (key){
    case "ArrowLeft": return clamp(i - 1);
    case "ArrowRight": return clamp(i + 1);
    case "ArrowUp": return clamp(i - cols);
    case "ArrowDown": return clamp(i + cols);
    case "Home": return 0;
    case "End": return count - 1;
    default: return i;
  }
}

export function renderEmojiGrid(onChipChange){
  const grid = document.getElementById("emojiGrid");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Quick add emoji");
  const buttons = PICKER_EMOJI.map((e, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    const on = state.palette.includes(e);
    chip.className = "emoji-chip" + (on ? " active" : "");
    chip.textContent = e;
    chip.tabIndex = i === 0 ? 0 : -1;
    chip.setAttribute("aria-pressed", String(on));
    chip.addEventListener("click", () => {
      const j = state.palette.lastIndexOf(e); // drop the newest copy, keeping the early slots stable
      if (j >= 0){
        if (state.palette.length > 1) state.palette.splice(j,1);
      } else {
        state.palette.push(e);
        recordUse(e);
      }
      syncGridActiveStates();
      renderPaletteChips(onChipChange);
      if (onChipChange) onChipChange();
    });
    chip.addEventListener("focus", () => buttons.forEach(b => { b.tabIndex = b === chip ? 0 : -1; }));
    grid.appendChild(chip);
    return chip;
  });
  grid.addEventListener("keydown", e => {
    const i = buttons.indexOf(document.activeElement);
    if (i < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const to = rovingNext(i, e.key, buttons.length, cols);
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key)) return;
    e.preventDefault();
    buttons[to].focus();
  });
}

// Move arr[from] to position `to` (in place); returns arr.
export function moveItem(arr, from, to){
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
  return arr;
}

// Caption under the palette (spec §4 "Palette cue").
export function cueText(label, used, total){
  if (used >= total) return total === 1
    ? `${label} is using your 1 emoji`
    : `${label} is using all ${total} of your emoji`;
  return `${label} is using ${used} of your ${total} emoji — move one earlier to use it`;
}

// Dim the chips the mandala doesn't use and update the caption.
export function updatePaletteCue(used, label){
  document.querySelectorAll("#paletteChips .palette-chip").forEach((chip, i) => {
    chip.classList.toggle("unused", !used.has(i));
  });
  const cue = document.getElementById("paletteCue");
  const text = cueText(label, used.size, state.palette.length);
  if (cue.textContent !== text) cue.textContent = text;
}

const DRAG_START_PX = 6;
let dragJustEnded = false;

// Mouse or touch drag, Shift+←/→, Delete and the selection toolbar edit the palette.
function attachChip(chip, i){
  chip.addEventListener("focus", () => setRover(i));
  chip.addEventListener("click", () => {
    if (dragJustEnded) return; // the click that follows a drag must not select
    select(i);
  });
  chip.addEventListener("keydown", e => {
    const n = state.palette.length;
    if (e.key === "Delete" || e.key === "Backspace"){
      e.preventDefault();
      removeChip(i);
    } else if (e.key === "Escape"){
      if (selected === null) return;
      e.preventDefault();
      selected = null;
      updateToolbar();
    } else if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")){
      e.preventDefault();
      const to = e.key === "ArrowLeft" ? i - 1 : i + 1;
      if (to < 0 || to >= n) return;
      moveChip(i, to);
      setRover(to);
      focusChip(to);
    } else if (["ArrowLeft","ArrowRight","Home","End"].includes(e.key) && !e.altKey && !e.ctrlKey && !e.metaKey){
      e.preventDefault();
      focusChip(rovingNext(i, e.key, n, 1));
    }
  });
  chip.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    const chips = [...chip.parentElement.children];
    const centers = chips.map(c => {
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    let dragging = false, target = i;
    const move = ev => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!dragging){
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        dragging = true;
        // Capture only now, so a plain tap is an ordinary click.
        chip.setPointerCapture(ev.pointerId);
        chip.classList.add("dragging");
      }
      chip.style.transform = `translate(${dx}px, ${dy}px)`;
      let best = Infinity;
      centers.forEach((c, j) => {
        const d = Math.hypot(ev.clientX - c.x, ev.clientY - c.y);
        if (d < best){ best = d; target = j; }
      });
      chips.forEach((c, j) => c.classList.toggle("drop-target", j === target && j !== i));
    };
    const end = ev => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!dragging) return;
      dragJustEnded = true;
      setTimeout(() => { dragJustEnded = false; }, 0);
      // Reorder only on pointerup: buildChips rebuilds the row.
      if (ev.type === "pointerup" && target !== i){
        selected = null;
        moveChip(i, target);
        setRover(target);
        focusChip(target, { preventScroll: true });
      } else {
        chip.classList.remove("dragging");
        chip.style.transform = "";
        chips.forEach(c => c.classList.remove("drop-target"));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  });
}

export function setupCustomEmojiInput(onInput){
  const customInput = document.getElementById("customEmoji");
  let addTimer = null;
  customInput.addEventListener("input", () => {
    clearTimeout(addTimer);
    addTimer = setTimeout(() => {
      const val = customInput.value.trim();
      customInput.value = "";
      if (!val) return;
      splitEmojiClusters(val).forEach(c => {
        state.palette.push(c);
        recordUse(c);
      });
      renderPaletteChips(onInput);
      syncGridActiveStates();
      onInput();
    }, 150);
  });
}
