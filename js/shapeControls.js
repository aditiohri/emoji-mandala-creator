import { state } from "./state.js";
import { SHAPES, getShape, defaultParams } from "./shapes/index.js";
import { canvas, renderTo } from "./draw.js";

// The current shape's params, filled from its defaults on first visit.
// Each shape keeps its own values for the session (spec §1 "Switching shapes").
export function currentParams(){
  return state.shapeParams[state.shape] ??= defaultParams(getShape(state.shape));
}

// Sliders for the current shape's controls, generated from `shape.controls`,
// plus the Alternate switch's label and visibility.
export function renderShapeControls(onChange){
  const shape = getShape(state.shape), params = currentParams();
  const wrap = document.getElementById("shapeControls");
  wrap.innerHTML = "";
  for (const c of shape.controls){
    const format = c.format ?? String;
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.htmlFor = `shape-${c.key}`;
    const val = document.createElement("span");
    val.className = "val";
    val.id = `shape-${c.key}-val`;
    val.textContent = format(params[c.key]);
    label.append(c.label + " ", val);
    const input = document.createElement("input");
    // min/max/step before value, or the browser snaps value to the old step.
    Object.assign(input, { type: "range", id: `shape-${c.key}`, min: c.min, max: c.max, step: c.step });
    input.value = params[c.key];
    input.addEventListener("input", () => {
      params[c.key] = Number(input.value);
      val.textContent = format(params[c.key]);
      onChange();
    });
    field.append(label, input);
    wrap.appendChild(field);
  }
  const row = document.getElementById("alternateRow");
  row.hidden = !shape.alternate;
  if (shape.alternate){
    document.getElementById("alternateLabel").textContent = shape.alternate.label;
    document.getElementById("alternate").checked = params.alternate;
  }
}

// Shape thumbnail strip (spec §4): one button per shape with a live preview.
const THUMB_PX = 144; // backing pixels for a 72px tile, sharp on 2× screens

export function renderShapeStrip(onChange){
  const strip = document.getElementById("shapeStrip");
  strip.innerHTML = "";
  for (const shape of SHAPES){
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "shape-tile";
    tile.dataset.shape = shape.id;
    tile.title = shape.label;
    tile.setAttribute("aria-label", shape.label);
    const c = document.createElement("canvas");
    c.width = c.height = THUMB_PX;
    tile.appendChild(c);
    tile.addEventListener("click", () => selectShape(shape.id, onChange));
    strip.appendChild(tile);
  }
  syncShapeStrip();
  drawShapeThumbs();
}

export function selectShape(id, onChange){
  state.shape = id;
  syncShapeStrip();
  renderShapeControls(onChange);
  onChange();
}

export function syncShapeStrip(){
  document.querySelectorAll("#shapeStrip .shape-tile").forEach(tile => {
    tile.setAttribute("aria-pressed", String(tile.dataset.shape === state.shape));
  });
}

// Previews use each shape's defaults with the current palette, background
// and glow, scaled from the main canvas (spec §3 "Thumbnails").
export function drawShapeThumbs(){
  document.querySelectorAll("#shapeStrip .shape-tile").forEach(tile => {
    const shape = getShape(tile.dataset.shape);
    const c = tile.querySelector("canvas"), k = c.width / canvas.width;
    renderTo(c.getContext("2d"), c.width, {
      shape, params: defaultParams(shape), palette: state.palette,
      background: state.background, glow: state.glow,
      emojiSize: 44 * k, rotation: 0, centerMode: "emoji", faceOutward: false, minFont: 14 * k,
    });
  });
}
