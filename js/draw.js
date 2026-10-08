import { state, DEFAULT_PALETTE } from "./state.js";
import { drawBackground } from "./backgrounds.js";
import { getShape } from "./shapes/index.js";
import { assignEmoji } from "./pattern.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

export let canvas = null;
export let ctx = null;

export function initCanvas(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

// Draw a mandala on any square canvas of side W.
// opts = { shape, params, palette, background, glow, emojiSize,
//          rotation (degrees), centerMode, faceOutward, minFont }
// Returns { used }: the palette indices drawn.
export function renderTo(ctx, W, opts){
  const { shape, params, emojiSize, minFont, faceOutward } = opts;
  ctx.clearRect(0, 0, W, W);
  const dark = drawBackground(ctx, W, W, {
    background: opts.background, glow: opts.glow, emojiSize,
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
  for (const p of placements){
    ctx.font = Math.max(minFont, emojiSize * p.scale) + FONT;
    ctx.save();
    ctx.translate(cx + p.x*cos - p.y*sin, cy + p.x*sin + p.y*cos);
    if (faceOutward && p.heading !== null) ctx.rotate(p.heading + rot + Math.PI/2);
    ctx.fillText(emojiFor(p.group, p.index), 0, 0);
    ctx.restore();
  }
  return { used };
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
  });
}
