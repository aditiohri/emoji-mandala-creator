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

test("guide rings at i/guideRings of maxR, from explicit options", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, {
    background: { type: "solid", color: "#000000" },
    backdrop: "rings", emojiSize: 44, guideRings: 4,
  });
  const maxR = 500 - 44 * 0.9;
  assert.deepEqual(ctx.calls.map(c => c.r), [1, 2, 3, 4].map(i => (i / 4) * maxR));
  assert.ok(ctx.calls.every(c => c.x === 500 && c.y === 500));
});

test("returns dark for dark solid, light for light solid", () => {
  const opts = { backdrop: "none", emojiSize: 44, guideRings: 6 };
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#000000" } }), true);
  assert.equal(drawBackground(mockCtx(), 1000, 1000, { ...opts, background: { type: "solid", color: "#ffffff" } }), false);
});

test("soft backdrop draws one glow circle of radius maxR*1.05", () => {
  const ctx = mockCtx();
  drawBackground(ctx, 1000, 1000, { background: { type: "solid", color: "#000000" }, backdrop: "soft", emojiSize: 20, guideRings: 6 });
  assert.deepEqual(ctx.calls.map(c => c.r), [(500 - 20 * 0.9) * 1.05]);
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
