import { test } from "node:test";
import assert from "node:assert/strict";
import { drawBackground, getBackgroundLuminance, activeBackgroundIndex } from "../js/backgrounds.js";

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

const ALL = [
  { type: "system" },
  { type: "solid", color: "#ff6b4a" },
  { type: "gradient", color1: "#111111", color2: "#222222", angle: 45 },
  { type: "image", dataUrl: "data:image/jpeg;base64,AAA" },
  { type: "solid", color: "#ff6b4a" }, // custom duplicate of index 1
];

test("activeBackgroundIndex: system, solid and gradient match by value", () => {
  assert.equal(activeBackgroundIndex(ALL, { type: "system" }), 0);
  assert.equal(activeBackgroundIndex(ALL, { type: "solid", color: "#ff6b4a" }), 1);
  assert.equal(activeBackgroundIndex(ALL, { type: "gradient", color1: "#111111", color2: "#222222", angle: 45 }), 2);
  assert.equal(activeBackgroundIndex(ALL, { type: "gradient", color1: "#111111", color2: "#222222", angle: 90 }), -1);
});

test("activeBackgroundIndex: image matches by its data URL, not by a stale idx", () => {
  const cur = { type: "image", imageElement: { src: "data:image/jpeg;base64,AAA" }, idx: 9 };
  assert.equal(activeBackgroundIndex(ALL, cur), 3);
});

test("activeBackgroundIndex: current.idx wins when it still matches (custom duplicate of a preset)", () => {
  assert.equal(activeBackgroundIndex(ALL, { type: "solid", color: "#ff6b4a", idx: 4 }), 4);
  assert.equal(activeBackgroundIndex(ALL, { type: "solid", color: "#ff6b4a", idx: 2 }), 1); // stale idx falls back to first match
});

test("activeBackgroundIndex: nothing matches -> -1", () => {
  assert.equal(activeBackgroundIndex(ALL, { type: "solid", color: "#123456" }), -1);
  assert.equal(activeBackgroundIndex(ALL, null), -1);
});
