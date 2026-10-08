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
