import { state, PICKER_EMOJI } from "./state.js";
import { initCanvas, draw } from "./draw.js";
import {
  renderPaletteChips,
  renderEmojiGrid,
  syncGridActiveStates,
  setupCustomEmojiInput
} from "./palette.js";
import {
  setupExportPanel,
  setupSaveButton,
  setupShareButton
} from "./export.js";

initCanvas();

// Setup palette UI
renderPaletteChips(draw);
renderEmojiGrid(draw);
setupCustomEmojiInput(draw);

// Setup emoji picker dialog
const emojiDialog = document.getElementById("emojiDialog");
const emojiPicker = document.getElementById("emojiPicker");
document.getElementById("browseEmoji").addEventListener("click", () => {
  emojiDialog.showModal();
});
document.getElementById("closeEmojiDialog").addEventListener("click", () => {
  emojiDialog.close();
});
emojiDialog.addEventListener("click", (e) => {
  if (e.target === emojiDialog) emojiDialog.close();
});
emojiPicker.addEventListener("emoji-click", (e) => {
  const emoji = e.detail && e.detail.unicode;
  if (!emoji) return;
  state.palette.push(emoji);
  renderPaletteChips(draw);
  syncGridActiveStates();
  draw();
});

// Setup sliders
function bindRange(id, labelId, stateKey, fmt){
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);
  el.addEventListener("input", () => {
    state[stateKey] = Number(el.value);
    if (label) label.textContent = fmt(state[stateKey]);
    draw();
  });
  if (label) label.textContent = fmt(state[stateKey]);
}

// Zoom slider (special handling)
const canvasWrap = document.querySelector(".canvas-wrap");
document.getElementById("zoom").addEventListener("input", e => {
  state.zoom = Number(e.target.value);
  document.getElementById("zoomVal").textContent = state.zoom + "%";
  canvasWrap.style.transform = "scale(" + (state.zoom/100) + ")";
});

bindRange("rings", "ringsVal", "rings", v => v);
bindRange("symmetry", "symVal", "symmetry", v => v);
bindRange("rotation", "rotVal", "rotation", v => v + "°");
bindRange("emojiSize", "sizeVal", "emojiSize", v => v + "px");
bindRange("spacing", "spaceVal", "spacing", v => (v/100).toFixed(1) + "×");

// Setup other controls
document.getElementById("centerMode").addEventListener("change", e => {
  state.centerMode = e.target.value;
  draw();
});
document.getElementById("backdrop").addEventListener("change", e => {
  state.backdrop = e.target.value;
  draw();
});
document.getElementById("alternate").addEventListener("change", e => {
  state.alternate = e.target.checked;
  draw();
});
document.getElementById("faceOutward").addEventListener("change", e => {
  state.faceOutward = e.target.checked;
  draw();
});

// Setup shuffle button
document.getElementById("shuffle").addEventListener("click", () => {
  state.rings = 3 + Math.floor(Math.random()*9);
  state.symmetry = 4 + Math.floor(Math.random()*18);
  state.rotation = Math.floor(Math.random()*360);
  state.spacing = 60 + Math.floor(Math.random()*90);
  state.alternate = Math.random() > 0.4;
  state.faceOutward = Math.random() > 0.6;

  document.getElementById("rings").value = state.rings;
  document.getElementById("ringsVal").textContent = state.rings;
  document.getElementById("symmetry").value = state.symmetry;
  document.getElementById("symVal").textContent = state.symmetry;
  document.getElementById("rotation").value = state.rotation;
  document.getElementById("rotVal").textContent = state.rotation + "°";
  document.getElementById("spacing").value = state.spacing;
  document.getElementById("spaceVal").textContent = (state.spacing/100).toFixed(1) + "×";
  document.getElementById("alternate").checked = state.alternate;
  document.getElementById("faceOutward").checked = state.faceOutward;

  // shuffle palette selection too, pick 4-7 random emoji
  const count = 4 + Math.floor(Math.random()*4);
  const shuffled = [...PICKER_EMOJI].sort(() => Math.random()-0.5);
  state.palette = shuffled.slice(0, count);
  syncGridActiveStates();
  renderPaletteChips(draw);

  draw();
});

// Setup export/save
setupExportPanel();
setupSaveButton();
setupShareButton();

// Setup theme listener
if (matchMedia){
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
}

// Initial draw
draw();
