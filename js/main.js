import { state, PICKER_EMOJI, DEFAULT_PALETTE } from "./state.js";
import { initCanvas, draw as drawCanvas } from "./draw.js";
import { SHAPES, getShape, randomParams } from "./shapes/index.js";
import {
  currentParams,
  renderShapeControls,
  renderShapeStrip,
  syncShapeStrip,
  drawShapeThumbs
} from "./shapeControls.js";
import {
  renderPaletteChips,
  renderEmojiGrid,
  syncGridActiveStates,
  setupCustomEmojiInput,
  updatePaletteCue
} from "./palette.js";
import {
  setupExportPanel,
  setupSaveButton,
  setupShareButton,
  canNativeShare
} from "./export.js";
import { cardLines, cardLabel, limitMessage, mirrorNote, noteAfterEdit } from "./card.js";
import { recordUse, topEmoji } from "./usage.js";
import { activeBackgroundIndex } from "./backgrounds.js";
import { addedNote } from "./addnote.js";
import { setupSavedPalettes } from "./savedPalettesUI.js";
import { describeMandala } from "./describe.js";
import { SECTION_IDS, defaultSections, parseSections, toggleSection, setAll, allOpen, openState } from "./sections.js";

// Preset backgrounds
const PRESET_BACKGROUNDS = [
  { type: "system", label: "Auto (matches device)" },
  { type: "solid", color: "#f7f0e2", label: "Cream" },
  { type: "solid", color: "#1a1526", label: "Deep purple" },
  { type: "solid", color: "#ffffff", label: "Pure white" },
  { type: "solid", color: "#000000", label: "Pure black" },
  { type: "solid", color: "#ff6b4a", label: "Coral" },
  { type: "solid", color: "#8b6bff", label: "Violet" },
  { type: "solid", color: "#d4a72c", label: "Gold" },
  { type: "gradient", color1: "#f7f0e2", color2: "#1a1526", angle: 135, label: "Light to dark" },
  { type: "gradient", color1: "#ff6b4a", color2: "#8b6bff", angle: 45, label: "Coral to violet" },
  { type: "gradient", color1: "#d4a72c", color2: "#ff6b4a", angle: 90, label: "Gold to coral" },
];

initCanvas();

// Keep the canvas's text description current; say it aloud (politely, after
// the person stops adjusting) only when it changed. The first one is silent.
const canvasEl = document.getElementById("canvas");
const mandalaStatus = document.getElementById("mandalaStatus");
let lastDescription = "", statusTimer = null;
function describeForScreenReaders(){
  const text = describeMandala(state, getShape(state.shape), currentParams());
  canvasEl.setAttribute("aria-label", cardLabel(cardLines(state.card.message)) + "Your emoji mandala. " + text);
  document.getElementById("rotation").setAttribute("aria-valuetext", state.rotation + "°");
  document.getElementById("emojiSize").setAttribute("aria-valuetext", state.emojiSize + "px");
  if (text === lastDescription) return;
  const first = lastDescription === "";
  lastDescription = text;
  if (first) return;
  clearTimeout(statusTimer);
  mandalaStatus.textContent = "";
  statusTimer = setTimeout(() => { mandalaStatus.textContent = text; }, 800);
}

// Redraw the canvas, show which palette emoji it used, refresh the previews.
function draw(){
  const { used } = drawCanvas();
  updatePaletteCue(used, getShape(state.shape).label);
  drawShapeThumbs();
  describeForScreenReaders();
}

// Initialize palette from usage data if available
const usedEmoji = topEmoji(8);
if (usedEmoji && usedEmoji.length > 0) {
  state.palette = usedEmoji;
  // Pad with DEFAULT_PALETTE without duplicates
  for (const e of DEFAULT_PALETTE) {
    if (state.palette.length >= 8) break;
    if (!state.palette.includes(e)) {
      state.palette.push(e);
    }
  }
}

// Setup palette UI
renderPaletteChips(draw);
renderEmojiGrid(draw);
setupCustomEmojiInput(draw);
setupSavedPalettes(draw);

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
// The palette is dimmed (or hidden, on phones) behind the dialog, so confirm each pick inside it.
const emojiAdded = document.getElementById("emojiAdded");
let addedTimer = null;
function showAddedNote(text) {
  emojiAdded.textContent = text;
  clearTimeout(addedTimer);
  addedTimer = setTimeout(() => { emojiAdded.textContent = ""; }, 2500);
}
emojiPicker.addEventListener("emoji-click", (e) => {
  const emoji = e.detail && e.detail.unicode;
  if (!emoji) return;
  state.palette.push(emoji);
  recordUse(emoji);
  renderPaletteChips(draw);
  syncGridActiveStates();
  draw();
  showAddedNote(addedNote(emoji, state.palette));
});


// Setup sliders. `target` returns the object the value lives in.
function bindRange(id, labelId, key, fmt, target = () => state){
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);
  el.addEventListener("input", () => {
    target()[key] = Number(el.value);
    if (label) label.textContent = fmt(target()[key]);
    draw();
  });
  if (label) label.textContent = fmt(target()[key]);
}

// A vertical swipe that starts on a slider should scroll the page, not move the
// slider. Touch browsers jump the thumb to the finger on touch-start, so once the
// gesture turns out to be vertical, put the value back.
(function guardSliderSwipe(){
  let el = null, startValue = "", x0 = 0, y0 = 0, decided = false;
  document.addEventListener("touchstart", e => {
    const t = e.target;
    el = t instanceof HTMLInputElement && t.type === "range" ? t : null;
    if (!el) return;
    startValue = el.value; decided = false;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!el || decided) return;
    const dx = Math.abs(e.touches[0].clientX - x0), dy = Math.abs(e.touches[0].clientY - y0);
    if (dx < 8 && dy < 8) return;
    decided = true;
    if (dy > dx && el.value !== startValue){
      el.value = startValue;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, { passive: true });
  document.addEventListener("touchend", () => { el = null; }, { passive: true });
})();

// Zoom slider (special handling)
const canvasWrap = document.querySelector(".canvas-wrap");
document.getElementById("zoom").addEventListener("input", e => {
  state.zoom = Number(e.target.value);
  document.getElementById("zoomVal").textContent = state.zoom + "%";
  e.target.setAttribute("aria-valuetext", state.zoom + "%");
  canvasWrap.style.transform = "scale(" + (state.zoom/100) + ")";
});

bindRange("rotation", "rotVal", "rotation", v => v + "°");
bindRange("emojiSize", "sizeVal", "emojiSize", v => v + "px");

// Shape strip and the current shape's generated sliders.
renderShapeStrip(draw);
renderShapeControls(draw);

// Setup other controls
document.getElementById("centerMode").addEventListener("change", e => {
  state.centerMode = e.target.value;
  draw();
});
// Soft glow: saved per device, next to the background.
try {
  const storedGlow = localStorage.getItem("mandala.glow");
  if (storedGlow !== null) state.glow = storedGlow === "true";
} catch(e) {}
document.getElementById("glow").checked = state.glow;
document.getElementById("glow").addEventListener("change", e => {
  state.glow = e.target.checked;
  try { localStorage.setItem("mandala.glow", String(state.glow)); } catch(err) {}
  draw();
});
document.getElementById("alternate").addEventListener("change", e => {
  currentParams().alternate = e.target.checked;
  draw();
});
document.getElementById("faceOutward").addEventListener("change", e => {
  state.faceOutward = e.target.checked;
  draw();
});

// Setup shuffle button
document.getElementById("shuffle").addEventListener("click", () => {
  // A random shape with random values for its own controls.
  const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
  state.shape = shape.id;
  state.shapeParams[shape.id] = randomParams(shape, Math.random);
  state.rotation = Math.floor(Math.random()*360);
  state.faceOutward = Math.random() > 0.6;

  syncShapeStrip();
  renderShapeControls(draw);
  document.getElementById("rotation").value = state.rotation;
  document.getElementById("rotVal").textContent = state.rotation + "°";
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

// Background management
function getStoredCustomBackgrounds() {
  try {
    const stored = localStorage.getItem("mandala.backgrounds");
    return stored ? JSON.parse(stored) : [];
  } catch(e) {
    return [];
  }
}

// Returns whether the write stuck (it throws when the storage quota is full).
function saveCustomBackgrounds(backgrounds) {
  try {
    localStorage.setItem("mandala.backgrounds", JSON.stringify(backgrounds));
    return true;
  } catch(e) {
    console.warn("Failed to save backgrounds:", e);
    return false;
  }
}

function showBackgroundNote(message) {
  const note = document.getElementById("bgNote");
  note.textContent = message;
  note.hidden = !message;
}

function getStoredBackground() {
  try {
    const stored = localStorage.getItem("mandala.background");
    return stored ? JSON.parse(stored) : null;
  } catch(e) {
    return null;
  }
}

function saveCurrentBackground() {
  try {
    // Don't store image data in background, just the index/type
    const bg = state.background;
    if (bg.type === "image") {
      // Just store that we're using a custom image (don't store the actual image)
      localStorage.setItem("mandala.background", JSON.stringify({ type: "image", idx: bg.idx }));
    } else {
      localStorage.setItem("mandala.background", JSON.stringify(bg));
    }
  } catch(e) {
    console.warn("Failed to save background:", e);
  }
}

function downscaleImage(img, maxSize = 800) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  // Scale down if needed
  if (width > maxSize || height > maxSize) {
    const scale = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.85);
}

function renderBackgroundPresets() {
  const presetsDiv = document.getElementById("bgPresets");
  // The list is rebuilt on every change; keep keyboard focus on the same swatch.
  const focused = document.activeElement?.closest?.("#bgPresets .bg-preset");
  const focusIdx = presetsDiv.contains(document.activeElement) && document.activeElement.classList.contains("bg-select")
    ? focused.dataset.idx : null;
  presetsDiv.innerHTML = "";

  const customBackgrounds = getStoredCustomBackgrounds();
  const allBackgrounds = [...PRESET_BACKGROUNDS, ...customBackgrounds];
  const activeIdx = activeBackgroundIndex(allBackgrounds, state.background);

  allBackgrounds.forEach((bg, idx) => {
    const swatch = document.createElement("div");
    swatch.className = "bg-preset";
    // The wrapper only positions things; the real control is this button, so
    // swatches take Tab, Enter and Space and the remove badge isn't nested in one.
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "bg-select";
    pick.setAttribute("aria-label", bg.label || bg.type);
    pick.setAttribute("aria-pressed", String(idx === activeIdx));
    swatch.appendChild(pick);
    swatch.dataset.type = bg.type;
    swatch.dataset.idx = idx;

    if (bg.type === "solid" && bg.color) {
      swatch.style.background = bg.color;
    } else if (bg.type === "gradient" && bg.color1 && bg.color2) {
      const angle = bg.angle || 0;
      swatch.style.background = cssGradient(angle, bg.color1, bg.color2);
    } else if (bg.type === "system") {
      swatch.style.background = "linear-gradient(135deg, #f7f0e2 50%, #1a1526 50%)";
    } else if (bg.type === "image" && bg.dataUrl) {
      swatch.style.backgroundImage = `url('${bg.dataUrl}')`;
    }

    if (idx === activeIdx) swatch.classList.add("active");

    // Remove button for custom backgrounds
    if (idx >= PRESET_BACKGROUNDS.length) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "bg-remove";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", "Remove background");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasActive = idx === activeIdx;
        const customs = getStoredCustomBackgrounds();
        customs.splice(idx - PRESET_BACKGROUNDS.length, 1);
        saveCustomBackgrounds(customs);
        if (wasActive) {
          setBackground(PRESET_BACKGROUNDS[0], 0);
        } else {
          // Later swatches shifted down one; keep the saved index in step.
          if (state.background.idx > idx) state.background.idx--;
          saveCurrentBackground();
          renderBackgroundPresets();
        }
      });
      swatch.appendChild(removeBtn);
    }

    pick.addEventListener("click", () => selectBackground(bg, idx));
    presetsDiv.appendChild(swatch);
  });

  if (focusIdx !== null) presetsDiv.querySelector(`.bg-preset[data-idx="${focusIdx}"] .bg-select`)?.focus();
}

// Stored image swatches only carry a data URL; load it before selecting.
// A later selection supersedes an image that is still loading.
let backgroundPick = 0;
function selectBackground(bg, idx) {
  if (bg.type !== "image" || bg.imageElement) return setBackground(bg, idx);
  const mine = ++backgroundPick;
  const img = new Image();
  img.onload = () => { if (mine === backgroundPick) setBackground({ ...bg, imageElement: img }, idx); };
  img.src = bg.dataUrl;
}

// `idx` is the swatch's position in presets + customs (see activeBackgroundIndex).
function setBackground(bg, idx = bg.idx) {
  backgroundPick++;
  showBackgroundNote("");
  if (bg.type === "system") {
    state.background = { type: "system", idx };
  } else if (bg.type === "solid") {
    state.background = { type: "solid", color: bg.color, idx };
  } else if (bg.type === "gradient") {
    state.background = { type: "gradient", color1: bg.color1, color2: bg.color2, angle: bg.angle || 0, idx };
  } else if (bg.type === "image" && bg.imageElement) {
    state.background = { type: "image", imageElement: bg.imageElement, idx };
  }

  saveCurrentBackground();
  renderBackgroundPresets();
  draw();
}

// The canvas measures the angle from "left to right"; CSS gradients start at "up".
function cssGradient(angle, c1, c2) {
  return `linear-gradient(${angle + 90}deg, ${c1}, ${c2})`;
}

function setupBackgroundControls() {
  const bgGradientInput = document.getElementById("bgGradient");
  const bgColor1Input = document.getElementById("bgColor1");
  const bgColor2Input = document.getElementById("bgColor2");
  const bgColor2Row = document.getElementById("bgColor2Row");
  const bgAngleInput = document.getElementById("bgAngle");
  const bgAngleRow = document.getElementById("bgAngleRow");
  const bgAngleVal = document.getElementById("bgAngleVal");
  const bgPreview = document.getElementById("bgPreview");
  const bgImageInput = document.getElementById("bgImage");
  const bgAddCustomBtn = document.getElementById("bgAddCustom");

  // The background the Custom colours controls describe right now.
  function customFromControls() {
    if (!bgGradientInput.checked) return { type: "solid", color: bgColor1Input.value };
    return { type: "gradient", color1: bgColor1Input.value, color2: bgColor2Input.value, angle: parseInt(bgAngleInput.value) };
  }

  function updateCustomPreview() {
    const c = customFromControls();
    bgPreview.style.background = c.type === "solid" ? c.color
      : cssGradient(c.angle, c.color1, c.color2);
    bgColor2Row.hidden = bgAngleRow.hidden = !bgGradientInput.checked;
    bgAngleVal.textContent = bgAngleInput.value + "°";
    bgAngleInput.setAttribute("aria-valuetext", bgAngleVal.textContent);
  }

  // Any change to the controls shows up on the canvas straight away (no swatch is
  // selected until it is saved; one lights up only if the value matches).
  function onCustomInput() {
    updateCustomPreview();
    setBackground(customFromControls(), undefined);
  }
  for (const el of [bgGradientInput, bgColor1Input, bgColor2Input, bgAngleInput]) {
    el.addEventListener("input", onCustomInput);
  }

  // After a reload, show the restored colours in the controls so Save saves what is on the canvas.
  function syncCustomControls(bg) {
    if (bg.type === "solid") {
      bgGradientInput.checked = false;
      bgColor1Input.value = bg.color;
    } else if (bg.type === "gradient") {
      bgGradientInput.checked = true;
      bgColor1Input.value = bg.color1;
      bgColor2Input.value = bg.color2;
      bgAngleInput.value = bg.angle || 0;
    }
    updateCustomPreview();
  }
  updateCustomPreview();

  bgAddCustomBtn.addEventListener("click", () => {
    const candidate = customFromControls();
    const customs = getStoredCustomBackgrounds();
    const all = [...PRESET_BACKGROUNDS, ...customs];
    const existing = activeBackgroundIndex(all, candidate);
    if (existing >= 0) {
      setBackground(all[existing], existing);
      showBackgroundNote("Already in your backgrounds");
      return;
    }
    customs.push({ ...candidate, label: "Custom" });
    if (!saveCustomBackgrounds(customs)) {
      showBackgroundNote("There's no room to save this on this device. It's used for now, but it won't be in your backgrounds. Remove some saved ones to make room.");
      return;
    }
    setBackground(customs[customs.length - 1], PRESET_BACKGROUNDS.length + customs.length - 1);
    showBackgroundNote("Saved to your backgrounds");
  });

  bgImageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = downscaleImage(img, 800);
        const customs = getStoredCustomBackgrounds();
        customs.push({ type: "image", dataUrl, label: "Custom image" });
        const saved = saveCustomBackgrounds(customs);

        // Reload the image for immediate use
        const newImg = new Image();
        newImg.onload = () => {
          if (saved) {
            setBackground({ type: "image", imageElement: newImg, idx: PRESET_BACKGROUNDS.length + customs.length - 1 });
            return;
          }
          // Storage is full: use the image for now, but say it won't survive a reload.
          backgroundPick++;
          state.background = { type: "image", imageElement: newImg, idx: -1 };
          renderBackgroundPresets();
          draw();
          showBackgroundNote("This image is too big to save on this device. It's used for now, but it will be gone when you reload. Remove some saved backgrounds to make room.");
        };
        newImg.src = dataUrl;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // Clear the input
    bgImageInput.value = "";
  });

  renderBackgroundPresets();

  // Restore saved background
  const saved = getStoredBackground();
  if (saved) {
    if (saved.type === "image" && typeof saved.idx === "number") {
      const customs = getStoredCustomBackgrounds();
      const customIdx = saved.idx - PRESET_BACKGROUNDS.length;
      if (customIdx >= 0 && customIdx < customs.length && customs[customIdx].dataUrl) {
        const img = new Image();
        img.src = customs[customIdx].dataUrl;
        img.onload = () => {
          const bg = { ...customs[customIdx], imageElement: img, idx: saved.idx };
          setBackground(bg);
        };
      }
    } else {
      setBackground(saved);
      syncCustomControls(saved);
    }
  }
}

setupBackgroundControls();

// Collapsible control sections. Open/closed is remembered per device; a first
// visit starts with just Shape open on a phone and everything open on desktop.
function setupSections(){
  const isPhone = matchMedia("(max-width: 860px)").matches;
  let raw = null;
  try { raw = localStorage.getItem("mandala.sections"); } catch(e) {}
  let open = parseSections(raw, defaultSections(isPhone));
  const all = document.getElementById("toggleAll");
  const desc = document.getElementById("toggleAllDesc");
  function apply(){
    for (const id of SECTION_IDS){
      document.getElementById(`section-${id}-btn`).setAttribute("aria-expanded", String(open[id]));
      document.getElementById(`section-${id}-body`).hidden = !open[id];
    }
    const st = openState(open);
    const name = st === "all" ? "Hide all controls" : "Show all controls";
    all.dataset.state = st;
    all.setAttribute("aria-label", name);
    all.title = name;
    const count = SECTION_IDS.filter(id => open[id]).length;
    desc.textContent = st === "some" ? `${count} of ${SECTION_IDS.length} sections open` : "";
    if (st === "some") all.setAttribute("aria-describedby", "toggleAllDesc");
    else all.removeAttribute("aria-describedby");
  }
  function change(next){
    open = next;
    apply();
    try { localStorage.setItem("mandala.sections", JSON.stringify(open)); } catch(e) {}
  }
  for (const id of SECTION_IDS){
    document.getElementById(`section-${id}-btn`).addEventListener("click", () => {
      change(toggleSection(open, id));
    });
  }
  all.addEventListener("click", () => {
    change(setAll(!allOpen(open)));
  });
  apply();
}
setupSections();

// Greeting card: message, layout and share note. The layout is saved per device;
// the message and note only for this tab (a card is usually a one-off).
function setupCard(){
  const message = document.getElementById("cardMessage");
  const cutNote = document.getElementById("cardMessageStatus");
  const layoutHint = document.getElementById("cardLayoutHint");
  const note = document.getElementById("shareNote");
  const layoutBtns = [...document.querySelectorAll(".layout-btn")];
  const card = state.card;

  try {
    const layout = localStorage.getItem("mandala.card.layout");
    if (layoutBtns.some(b => b.dataset.layout === layout)) card.layout = layout;
  } catch(e) {}
  try {
    const saved = JSON.parse(sessionStorage.getItem("mandala.card"));
    if (saved && typeof saved.message === "string"){
      card.message = limitMessage(saved.message).text;
      card.noteMirrors = saved.noteMirrors !== false;
      card.note = card.noteMirrors || typeof saved.note !== "string" ? mirrorNote(card.message) : saved.note;
    }
  } catch(e) {}

  function remember(){
    try { sessionStorage.setItem("mandala.card", JSON.stringify({ message: card.message, note: card.note, noteMirrors: card.noteMirrors })); } catch(e) {}
  }
  function sync(){
    layoutBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.layout === card.layout)));
    layoutHint.hidden = cardLines(card.message)[0] !== "";
  }

  message.value = card.message;
  note.value = card.note;
  sync();
  document.getElementById("shareNoteField").hidden = !canNativeShare();

  // Enter on the second line does nothing.
  message.addEventListener("keydown", e => {
    if (e.key === "Enter" && message.value.includes("\n") && message.selectionStart === message.selectionEnd) e.preventDefault();
  });
  message.addEventListener("input", () => {
    const { text, cut } = limitMessage(message.value);
    if (text !== message.value) message.value = text;
    cutNote.textContent = cut ? "Cut to two lines of 60 characters." : "";
    cutNote.hidden = !cut;
    card.message = text;
    if (card.noteMirrors){
      card.note = mirrorNote(text);
      note.value = card.note;
    }
    remember();
    sync();
    draw();
  });
  note.addEventListener("input", () => {
    const next = noteAfterEdit(note.value, card.message);
    card.note = next.note;
    card.noteMirrors = next.noteMirrors;
    if (note.value !== card.note) note.value = card.note;
    remember();
  });
  layoutBtns.forEach(b => b.addEventListener("click", () => {
    card.layout = b.dataset.layout;
    try { localStorage.setItem("mandala.card.layout", card.layout); } catch(e) {}
    sync();
    draw();
  }));

  // The card's fonts load lazily; redraw once they are in so the first frame isn't a fallback.
  if (document.fonts && document.fonts.load){
    Promise.allSettled([
      document.fonts.load("600 64px Fraunces", "Aa"),
      document.fonts.load("500 40px Sora", "Aa"),
    ]).then(() => { if (card.message) draw(); });
  }
}
setupCard();

// Initial draw
draw();
