import { state, PICKER_EMOJI, DEFAULT_PALETTE } from "./state.js";
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
import { recordUse, topEmoji } from "./usage.js";

// Preset backgrounds
const PRESET_BACKGROUNDS = [
  { type: "system", label: "System" },
  { type: "solid", color: "#f7f0e2", label: "Light cream" },
  { type: "solid", color: "#1a1526", label: "Dark purple" },
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
  recordUse(emoji);
  renderPaletteChips(draw);
  syncGridActiveStates();
  draw();
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
const ringsParams = () => state.shapeParams.rings;

// Zoom slider (special handling)
const canvasWrap = document.querySelector(".canvas-wrap");
document.getElementById("zoom").addEventListener("input", e => {
  state.zoom = Number(e.target.value);
  document.getElementById("zoomVal").textContent = state.zoom + "%";
  canvasWrap.style.transform = "scale(" + (state.zoom/100) + ")";
});

bindRange("rings", "ringsVal", "rings", v => v, ringsParams);
bindRange("symmetry", "symVal", "symmetry", v => v, ringsParams);
bindRange("rotation", "rotVal", "rotation", v => v + "°");
bindRange("emojiSize", "sizeVal", "emojiSize", v => v + "px");
bindRange("spacing", "spaceVal", "spacing", v => (v/100).toFixed(1) + "×", ringsParams);

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
  ringsParams().alternate = e.target.checked;
  draw();
});
document.getElementById("faceOutward").addEventListener("change", e => {
  state.faceOutward = e.target.checked;
  draw();
});

// Setup shuffle button
document.getElementById("shuffle").addEventListener("click", () => {
  const p = ringsParams();
  p.rings = 3 + Math.floor(Math.random()*9);
  p.symmetry = 4 + Math.floor(Math.random()*18);
  state.rotation = Math.floor(Math.random()*360);
  p.spacing = 60 + Math.floor(Math.random()*90);
  p.alternate = Math.random() > 0.4;
  state.faceOutward = Math.random() > 0.6;

  document.getElementById("rings").value = p.rings;
  document.getElementById("ringsVal").textContent = p.rings;
  document.getElementById("symmetry").value = p.symmetry;
  document.getElementById("symVal").textContent = p.symmetry;
  document.getElementById("rotation").value = state.rotation;
  document.getElementById("rotVal").textContent = state.rotation + "°";
  document.getElementById("spacing").value = p.spacing;
  document.getElementById("spaceVal").textContent = (p.spacing/100).toFixed(1) + "×";
  document.getElementById("alternate").checked = p.alternate;
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

function saveCustomBackgrounds(backgrounds) {
  try {
    localStorage.setItem("mandala.backgrounds", JSON.stringify(backgrounds));
  } catch(e) {
    console.warn("Failed to save backgrounds:", e);
  }
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
  presetsDiv.innerHTML = "";

  const customBackgrounds = getStoredCustomBackgrounds();
  const allBackgrounds = [...PRESET_BACKGROUNDS, ...customBackgrounds];

  allBackgrounds.forEach((bg, idx) => {
    const swatch = document.createElement("div");
    swatch.className = "bg-preset";
    swatch.dataset.type = bg.type;
    swatch.dataset.idx = idx;

    if (bg.type === "solid" && bg.color) {
      swatch.style.background = bg.color;
    } else if (bg.type === "gradient" && bg.color1 && bg.color2) {
      const angle = bg.angle || 0;
      swatch.style.background = `linear-gradient(${angle}deg, ${bg.color1}, ${bg.color2})`;
    } else if (bg.type === "system") {
      swatch.style.background = "linear-gradient(135deg, #f7f0e2 50%, #1a1526 50%)";
    } else if (bg.type === "image" && bg.dataUrl) {
      swatch.style.backgroundImage = `url('${bg.dataUrl}')`;
    }

    // Mark as active if selected
    if (state.background.type === bg.type) {
      if (bg.type === "system" || idx === state.background.idx) {
        swatch.classList.add("active");
      }
    }

    // Remove button for custom backgrounds
    if (idx >= PRESET_BACKGROUNDS.length) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "bg-remove";
      removeBtn.textContent = "✕";
      removeBtn.type = "button";
      removeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const customs = getStoredCustomBackgrounds();
        customs.splice(idx - PRESET_BACKGROUNDS.length, 1);
        saveCustomBackgrounds(customs);
        renderBackgroundPresets();
        if (state.background.idx === idx) {
          setBackground(PRESET_BACKGROUNDS[0]);
        }
      });
      swatch.appendChild(removeBtn);
    }

    swatch.addEventListener("click", () => setBackground(bg));
    presetsDiv.appendChild(swatch);
  });
}

function setBackground(bg) {
  if (bg.type === "system") {
    state.background = { type: "system" };
  } else if (bg.type === "solid") {
    state.background = { type: "solid", color: bg.color };
  } else if (bg.type === "gradient") {
    state.background = { type: "gradient", color1: bg.color1, color2: bg.color2, angle: bg.angle || 0 };
  } else if (bg.type === "image" && bg.imageElement) {
    state.background = { type: "image", imageElement: bg.imageElement, idx: bg.idx };
  }

  saveCurrentBackground();
  renderBackgroundPresets();
  draw();
}

function setupBackgroundControls() {
  const bgTypeSelect = document.getElementById("bgType");
  const bgColor1Input = document.getElementById("bgColor1");
  const bgColor2Input = document.getElementById("bgColor2");
  const bgColor2Row = document.getElementById("bgColor2Row");
  const bgAngleInput = document.getElementById("bgAngle");
  const bgAngleRow = document.getElementById("bgAngleRow");
  const bgAngleVal = document.getElementById("bgAngleVal");
  const bgImageInput = document.getElementById("bgImage");
  const bgAddCustomBtn = document.getElementById("bgAddCustom");

  bgTypeSelect.addEventListener("change", (e) => {
    if (e.target.value === "gradient") {
      bgColor2Row.hidden = false;
      bgAngleRow.hidden = false;
    } else {
      bgColor2Row.hidden = true;
      bgAngleRow.hidden = true;
    }
  });

  bgAngleInput.addEventListener("input", () => {
    bgAngleVal.textContent = bgAngleInput.value + "°";
  });

  bgAddCustomBtn.addEventListener("click", () => {
    const type = bgTypeSelect.value;
    const customs = getStoredCustomBackgrounds();

    if (type === "solid") {
      const color = bgColor1Input.value;
      customs.push({ type: "solid", color, label: "Custom" });
      saveCustomBackgrounds(customs);
    } else if (type === "gradient") {
      const color1 = bgColor1Input.value;
      const color2 = bgColor2Input.value;
      const angle = parseInt(bgAngleInput.value);
      customs.push({ type: "gradient", color1, color2, angle, label: "Custom" });
      saveCustomBackgrounds(customs);
    }

    renderBackgroundPresets();
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
        saveCustomBackgrounds(customs);

        // Reload the image for immediate use
        const newImg = new Image();
        newImg.src = dataUrl;
        newImg.onload = () => {
          const bg = { type: "image", imageElement: newImg, idx: PRESET_BACKGROUNDS.length + customs.length - 1 };
          setBackground(bg);
          renderBackgroundPresets();
        };
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
    }
  }
}

setupBackgroundControls();

// Initial draw
draw();
