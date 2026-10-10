import { state, DEFAULT_PALETTE } from "./state.js";
import { drawBackground } from "./backgrounds.js";
import { getShape } from "./shapes/index.js";
import { assignEmoji } from "./pattern.js";
import { cardLines, cardLayout, needsHalo, INK_LIGHT, INK_DARK } from "./card.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

export let canvas = null;
export let ctx = null;

export function initCanvas(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

// Draw a mandala on any square canvas of side W.
// opts = { shape, params, palette, background, glow, emojiSize,
//          rotation (degrees), centerMode, faceOutward, minFont,
//          card: { area, runs } optional, in a 1000-unit design space (js/card.js) }
// Returns { used }: the palette indices drawn.
export function renderTo(ctx, W, opts){
  const { shape, params, emojiSize, minFont, faceOutward } = opts;
  ctx.clearRect(0, 0, W, W);
  // With a card message the mandala shrinks into `area` and the text goes around it.
  const k = W / 1000, card = opts.card;
  const area = card && card.area
    ? { cx: card.area.cx * k, cy: card.area.cy * k, size: card.area.size * k } : null;
  const dark = drawBackground(ctx, W, W, {
    background: opts.background, glow: opts.glow, emojiSize, area,
  });

  const cx = W/2, cy = W/2;
  const radius = W/2 - emojiSize*0.9;
  const rot = opts.rotation * Math.PI/180;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const palette = opts.palette.length ? opts.palette : DEFAULT_PALETTE;

  const { placements, groups } = shape.layout({ ...params, centerMode: opts.centerMode, radius, emojiSize, minFont });
  const { emojiFor, used } = assignEmoji(groups, palette, shape.maxEmoji);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#f2ecdd" : "#241c38";
  if (area){
    ctx.save();
    ctx.translate(area.cx, area.cy);
    ctx.scale(area.size / W, area.size / W);
    ctx.translate(-W/2, -W/2);
  }
  for (const p of placements){
    ctx.font = Math.max(minFont, emojiSize * p.scale) + FONT;
    ctx.save();
    ctx.translate(cx + p.x*cos - p.y*sin, cy + p.x*sin + p.y*cos);
    if (faceOutward && p.heading !== null) ctx.rotate(p.heading + rot + Math.PI/2);
    ctx.fillText(emojiFor(p.group, p.index), 0, 0);
    ctx.restore();
  }
  if (area) ctx.restore();
  if (card && card.runs.length) drawCardText(ctx, k, card.runs, dark, opts.background);
  return { used };
}

// Text runs from card.js: a halo in the opposite ink goes under the fill where
// plain ink wouldn't reach 4.5:1 (see needsHalo); otherwise plain ink.
function drawCardText(ctx, k, runs, dark, background){
  const halo = needsHalo(background, dark);
  ctx.save();
  ctx.scale(k, k);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.fillStyle = dark ? INK_LIGHT : INK_DARK;
  ctx.strokeStyle = dark ? "rgba(36,28,56,0.85)" : "rgba(242,236,221,0.85)";
  for (const r of runs){
    ctx.font = r.font;
    ctx.lineWidth = r.size * 0.14;
    ctx.save();
    ctx.translate(r.x, r.y);
    if (r.angle) ctx.rotate(r.angle);
    const text = r.glyph ?? r.text;
    if (halo) ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// The card for the current message and layout, laid out with this canvas's font metrics.
function currentCard(){
  const lines = cardLines(state.card.message);
  const measure = (text, font) => {
    ctx.save(); ctx.font = font;
    const w = ctx.measureText(text).width;
    ctx.restore();
    return w;
  };
  return cardLayout(lines, state.card.layout, measure);
}

export function draw(){
  return renderTo(ctx, canvas.width, {
    shape: getShape(state.shape),
    params: state.shapeParams[state.shape],
    palette: state.palette,
    background: state.background,
    glow: state.glow,
    emojiSize: state.emojiSize,
    rotation: state.rotation,
    centerMode: state.centerMode,
    faceOutward: state.faceOutward,
    minFont: 14,
    card: currentCard(),
  });
}
