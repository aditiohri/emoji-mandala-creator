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
  document.querySelectorAll(".emoji-chip").forEach(chip => {
    chip.classList.toggle("active", state.palette.includes(chip.textContent));
  });
}

export function renderPaletteChips(onChipChange){
  const wrap = document.getElementById("paletteChips");
  wrap.innerHTML = "";
  state.palette.forEach((e, i) => {
    const chip = document.createElement("span");
    chip.className = "palette-chip";
    const label = document.createElement("span");
    label.textContent = e;
    chip.appendChild(label);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove " + e);
    remove.addEventListener("click", () => {
      if (state.palette.length <= 1) return;
      state.palette.splice(i, 1);
      renderPaletteChips(onChipChange);
      syncGridActiveStates();
      if (onChipChange) onChipChange();
    });
    chip.appendChild(remove);
    attachReorder(chip, i, onChipChange);
    wrap.appendChild(chip);
  });
}

export function renderEmojiGrid(onChipChange){
  const grid = document.getElementById("emojiGrid");
  PICKER_EMOJI.forEach(e => {
    const chip = document.createElement("div");
    chip.className = "emoji-chip" + (state.palette.includes(e) ? " active" : "");
    chip.textContent = e;
    chip.addEventListener("click", () => {
      const i = state.palette.indexOf(e);
      if (i >= 0){
        if (state.palette.length > 1) state.palette.splice(i,1);
      } else {
        state.palette.push(e);
        recordUse(e);
      }
      chip.classList.toggle("active", state.palette.includes(e));
      renderPaletteChips(onChipChange);
      if (onChipChange) onChipChange();
    });
    grid.appendChild(chip);
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
  return `${label} is using ${used} of your ${total} emoji — drag one forward to use it`;
}

// Dim the chips the mandala doesn't use and update the caption.
export function updatePaletteCue(used, label){
  document.querySelectorAll("#paletteChips .palette-chip").forEach((chip, i) => {
    chip.classList.toggle("unused", !used.has(i));
  });
  document.getElementById("paletteCue").textContent = cueText(label, used.size, state.palette.length);
}

const DRAG_START_PX = 6;

function commitMove(from, to, onChipChange){
  moveItem(state.palette, from, to);
  renderPaletteChips(onChipChange);
  if (onChipChange) onChipChange();
}

// Drag (mouse or touch) and ←/→ keys reorder the palette.
function attachReorder(chip, i, onChipChange){
  chip.tabIndex = 0;
  chip.addEventListener("keydown", e => {
    const to = e.key === "ArrowLeft" ? i - 1 : e.key === "ArrowRight" ? i + 1 : null;
    if (to === null) return;
    e.preventDefault();
    if (to < 0 || to >= state.palette.length) return;
    commitMove(i, to, onChipChange);
    document.querySelectorAll("#paletteChips .palette-chip")[to].focus();
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
        // Capture only now, so a tap on × still reaches the × button.
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
      // Reorder only on pointerup: renderPaletteChips rebuilds the list.
      if (ev.type === "pointerup" && target !== i){
        commitMove(i, target, onChipChange);
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
