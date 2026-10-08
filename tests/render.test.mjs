import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTo } from "../js/draw.js";
import { getShape } from "../js/shapes/index.js";
import { state, DEFAULT_PALETTE } from "../js/state.js";
import rings from "../js/shapes/rings.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

// Records the translate/rotate in effect at each fillText. Both renderers only
// ever translate, then rotate, inside save/restore.
function mockCtx(){
  const calls = []; let t = { x: 0, y: 0, r: 0 }; const stack = [];
  return {
    calls, font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "", textBaseline: "",
    save(){ stack.push({ ...t }); }, restore(){ t = stack.pop(); },
    translate(x, y){ if (t.r !== 0) throw new Error("translate after rotate"); t = { ...t, x: t.x + x, y: t.y + y }; },
    rotate(a){ t = { ...t, r: t.r + a }; },
    fillText(text, x, y){ calls.push({ text, font: this.font, fillStyle: this.fillStyle, x: t.x + x, y: t.y + y, r: t.r }); },
    clearRect(){}, fillRect(){}, beginPath(){}, fill(){}, stroke(){}, arc(){},
    createRadialGradient(){ return { addColorStop(){} }; },
    createLinearGradient(){ return { addColorStop(){} }; },
  };
}

// Verbatim port of js/draw.js draw() before slice 1 (background omitted).
function legacyDraw(ctx, W, s){
  const cx = W/2, cy = W/2;
  const maxR = W/2 - s.emojiSize*0.9;
  ctx.font = s.emojiSize + FONT;
  const palette = s.palette.length ? s.palette : DEFAULT_PALETTE;
  if (s.centerMode === "emoji"){
    ctx.save(); ctx.translate(cx, cy);
    ctx.font = (s.emojiSize*1.05) + FONT;
    ctx.fillText(palette[0], 0, 0); ctx.restore();
  }
  const ringSpacing = (s.spacing/100) * (maxR / s.rings);
  for (let ring=1; ring<=s.rings; ring++){
    const r = ring * ringSpacing;
    const dir = (s.alternate && ring % 2 === 0) ? -1 : 1;
    const ringPatternOffset = (ring * 31) % palette.length;
    const ringRotOffset = (s.rotation * Math.PI/180) + (s.alternate && ring % 2 === 0 ? Math.PI/s.symmetry : 0);
    const ringSize = s.emojiSize * (1 - (ring-1)*0.03);
    ctx.font = Math.max(14, ringSize) + FONT;
    for (let k=0; k<s.symmetry; k++){
      const angle = dir * (k / s.symmetry) * Math.PI*2 + ringRotOffset;
      ctx.save(); ctx.translate(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      if (s.faceOutward) ctx.rotate(angle + Math.PI/2);
      ctx.fillText(palette[(ringPatternOffset + k) % palette.length], 0, 0);
      ctx.restore();
    }
  }
}

function render(s){
  const ctx = mockCtx();
  renderTo(ctx, 1000, {
    shape: rings, params: { rings: s.rings, symmetry: s.symmetry, spacing: s.spacing, alternate: s.alternate },
    palette: s.palette, background: { type: "solid", color: "#000000" }, backdrop: "none",
    emojiSize: s.emojiSize, rotation: s.rotation, centerMode: s.centerMode, faceOutward: s.faceOutward, minFont: 14,
  });
  return ctx.calls;
}

test("renderTo matches the pre-refactor draw() exactly", () => {
  const palettes = [[], ["x"], ["x", "y", "z"], [...DEFAULT_PALETTE]];
  for (const r of [1, 2, 5, 12]) for (const symmetry of [3, 10, 13, 24]) for (const spacing of [50, 150])
  for (const alternate of [true, false]) for (const faceOutward of [true, false]) for (const rotation of [0, 37])
  for (const emojiSize of [20, 80]) for (const centerMode of ["emoji", "empty"]) for (const palette of palettes) {
    const s = { rings: r, symmetry, spacing, alternate, faceOutward, rotation, emojiSize, centerMode, palette };
    const want = mockCtx(); legacyDraw(want, 1000, s);
    const got = render(s);
    const tag = JSON.stringify(s);
    assert.equal(got.length, want.calls.length, tag);
    got.forEach((g, i) => {
      const w = want.calls[i];
      assert.equal(g.text, w.text, tag);
      assert.equal(g.font, w.font, tag);
      assert.equal(g.fillStyle, "#f2ecdd", tag); // black background -> dark text colour
      assert.ok(Math.abs(g.x - w.x) < 1e-6 && Math.abs(g.y - w.y) < 1e-6, tag);
      assert.ok(Math.abs(g.r - w.r) < 1e-9, tag);
    });
  }
});

test("state holds rings params under shapeParams, matching control defaults", () => {
  assert.equal(state.shape, "rings");
  const defaults = Object.fromEntries(rings.controls.map(c => [c.key, c.default]));
  assert.deepEqual(state.shapeParams.rings, { ...defaults, alternate: rings.alternate.default });
  for (const k of ["rings", "symmetry", "spacing", "alternate"]) assert.ok(!(k in state), k);
  assert.equal(getShape(state.shape), rings);
});
