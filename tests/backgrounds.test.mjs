import { test } from "node:test";
import assert from "node:assert/strict";
import { drawBackground, getBackgroundLuminance } from "../js/backgrounds.js";

function mockCtx() {
  const calls = [];
  return {
    calls, fillStyle: "", strokeStyle: "", lineWidth: 1,
    fillRect() {}, beginPath() {}, fill() {}, stroke() {}, drawImage() {},
    arc(x, y, r) { calls.push({ op: "arc", x, y, r }); },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  };
}

test("returns dark for dark solid, light for light solid", () => {
  const opts = { glow: false, emojiSize: 44 };
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#000000" } }), true);
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#ffffff" } }), false);
});

test("glow draws one circle of radius maxR*1.05; no glow draws none", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, { background: { type: "solid", color: "#000000" }, glow: true, emojiSize: 20 });
  assert.deepEqual(ctx.calls.map(c => c.r), [(500 - 20 * 0.9) * 1.05]);
  const off = mockCtx();
  drawBackground(off, 1000, 1000, { background: { type: "solid", color: "#000000" }, glow: false, emojiSize: 20 });
  assert.deepEqual(off.calls, []);
});

test("getBackgroundLuminance takes the background object", () => {
  assert.equal(getBackgroundLuminance({ type: "solid", color: "#000000" }), 0);
  assert.equal(getBackgroundLuminance(undefined), 0.5);
});

test("image luminance is computed once per image element", () => {
  let created = 0;
  globalThis.document = {
    createElement() {
      created++;
      return { getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }) }) };
    },
  };
  try {
    const img = { width: 10, height: 10 };
    const bg = { type: "image", imageElement: img };
    const a = getBackgroundLuminance(bg);
    const b = getBackgroundLuminance(bg);
    assert.equal(a, b);
    assert.equal(created, 1);
  } finally { delete globalThis.document; }
});
