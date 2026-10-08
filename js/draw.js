import { state, DEFAULT_PALETTE, seededPick } from "./state.js";
import { drawBackground } from "./backgrounds.js";

export let canvas = null;
export let ctx = null;

export function initCanvas(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

export function draw(){
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // Draw background and get whether it's dark for text color
  const dark = drawBackground(ctx, W, H, state);

  const cx = W/2, cy = H/2;
  const maxR = W/2 - state.emojiSize*0.9;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = dark ? "#f2ecdd" : "#241c38";
  ctx.font = state.emojiSize + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

  const palette = state.palette.length ? state.palette : DEFAULT_PALETTE;

  if (state.centerMode === "emoji"){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.font = (state.emojiSize*1.05) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    ctx.fillText(palette[0], 0, 0);
    ctx.restore();
  }

  const ringSpacing = (state.spacing/100) * (maxR / state.rings);

  let paletteIdx = 0;
  for (let ring=1; ring<=state.rings; ring++){
    const r = ring * ringSpacing;
    const dir = (state.alternate && ring % 2 === 0) ? -1 : 1;
    const ringRotOffset = (state.rotation * Math.PI/180) + (state.alternate && ring % 2 === 0 ? Math.PI/state.symmetry : 0);
    const ringSize = state.emojiSize * (1 - (ring-1)*0.03);
    ctx.font = Math.max(14, ringSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

    for (let s=0; s<state.symmetry; s++){
      const angle = dir * (s / state.symmetry) * Math.PI*2 + ringRotOffset;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const emoji = seededPick(ring*31 + s*7, palette);

      ctx.save();
      ctx.translate(x, y);
      if (state.faceOutward){
        ctx.rotate(angle + Math.PI/2);
      }
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
      paletteIdx++;
    }
  }
}
