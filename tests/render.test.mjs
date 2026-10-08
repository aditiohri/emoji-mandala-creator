import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTo } from "../js/draw.js";
import { getShape } from "../js/shapes/index.js";
import { assignEmoji } from "../js/pattern.js";
import { state, DEFAULT_PALETTE } from "../js/state.js";
import rings from "../js/shapes/rings.js";

const FONT = "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

// Records the translate/rotate in effect at each fillText, and arcs drawn.
function mockCtx(){
  const calls = [], arcs = []; let t = { x: 0, y: 0, r: 0 }; const stack = [];
  return {
    calls, arcs, font: "", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "", textBaseline: "",
    save(){ stack.push({ ...t }); }, restore(){ t = stack.pop(); },
    translate(x, y){ if (t.r !== 0) throw new Error("translate after rotate"); t = { ...t, x: t.x + x, y: t.y + y }; },
    rotate(a){ t = { ...t, r: t.r + a }; },
    fillText(text, x, y){ calls.push({ text, font: this.font, x: t.x + x, y: t.y + y, r: t.r }); },
    clearRect(){}, fillRect(){}, beginPath(){}, fill(){}, stroke(){},
    arc(x, y, r){ arcs.push(r); },
    createRadialGradient(){ return { addColorStop(){} }; },
    createLinearGradient(){ return { addColorStop(){} }; },
  };
}

const params = { rings: 6, symmetry: 10, spacing: 100, alternate: true };
function render(over = {}){
  const ctx = mockCtx();
  const out = renderTo(ctx, 1000, {
    shape: rings, params, palette: [...DEFAULT_PALETTE], background: { type: "solid", color: "#000000" }, glow: false,
    emojiSize: 44, rotation: 0, centerMode: "emoji", faceOutward: false, minFont: 14, ...over,
  });
  return { ctx, out };
}
const layoutFor = (over = {}) => rings.layout({ ...params, centerMode: "emoji", radius: 1000 / 2 - 44 * 0.9, emojiSize: 44, minFont: 14, ...over });

test("draws each placement with assignEmoji's emoji, in order, at its position", () => {
  for (const rotation of [0, 37]) {
    const { ctx } = render({ rotation });
    const { placements, groups } = layoutFor();
    const { emojiFor } = assignEmoji(groups, DEFAULT_PALETTE, rings.maxEmoji);
    const rot = rotation * Math.PI / 180;
    assert.equal(ctx.calls.length, placements.length);
    placements.forEach((p, i) => {
      const c = ctx.calls[i];
      assert.equal(c.text, emojiFor(p.group, p.index));
      assert.equal(c.font, Math.max(14, 44 * p.scale) + FONT);
      assert.ok(Math.abs(c.x - (500 + p.x * Math.cos(rot) - p.y * Math.sin(rot))) < 1e-6);
      assert.ok(Math.abs(c.y - (500 + p.x * Math.sin(rot) + p.y * Math.cos(rot))) < 1e-6);
    });
  }
});

test("default palette at defaults: at most 6 emoji, rings are symmetric", () => {
  const { ctx } = render();
  assert.equal(ctx.calls[0].text, "✨");
  assert.ok(new Set(ctx.calls.map(c => c.text)).size <= 6);
  // ring 1 (10 spokes, period 2) alternates two emoji
  const ring1 = ctx.calls.slice(1, 11).map(c => c.text);
  assert.deepEqual(ring1, Array.from({ length: 10 }, (_, i) => DEFAULT_PALETTE[1 + i % 2]));
});

test("returns used from the assigner", () => {
  const { out } = render();
  const { groups } = layoutFor();
  assert.deepEqual([...out.used].sort(), [...assignEmoji(groups, DEFAULT_PALETTE, 6).used].sort());
  const three = render({ palette: ["x", "y", "z"] }).out.used;
  assert.deepEqual([...three].sort(), [0, 1, 2]);
});

test("empty palette falls back to DEFAULT_PALETTE", () => {
  const { ctx } = render({ palette: [] });
  assert.equal(ctx.calls[0].text, DEFAULT_PALETTE[0]);
  assert.ok(ctx.calls.every(c => typeof c.text === "string"));
});

test("face outward rotates ring emoji by heading + rot + pi/2, never the center", () => {
  const { ctx } = render({ faceOutward: true, rotation: 30 });
  const { placements } = layoutFor();
  const rot = 30 * Math.PI / 180;
  assert.equal(ctx.calls[0].r, 0);
  placements.forEach((p, i) => { if (p.heading !== null) assert.ok(Math.abs(ctx.calls[i].r - (p.heading + rot + Math.PI / 2)) < 1e-9); });
  assert.ok(render().ctx.calls.every(c => c.r === 0));
});

test("glow option reaches the background", () => {
  assert.equal(render({ glow: true }).ctx.arcs.length, 1);
  assert.equal(render({ glow: false }).ctx.arcs.length, 0);
});

test("state: rings params under shapeParams, glow replaces backdrop", () => {
  assert.equal(state.shape, "rings");
  const defaults = Object.fromEntries(rings.controls.map(c => [c.key, c.default]));
  assert.deepEqual(state.shapeParams.rings, { ...defaults, alternate: rings.alternate.default });
  for (const k of ["rings", "symmetry", "spacing", "alternate", "backdrop"]) assert.ok(!(k in state), k);
  assert.equal(state.glow, true);
  assert.equal(getShape(state.shape), rings);
});
