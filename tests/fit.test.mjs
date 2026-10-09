import { test } from "node:test";
import assert from "node:assert/strict";
import { MIN_SCALE, fitFloor, chord, fitRing, fitGap, polygonPoints, petalOutline, petalSpoke } from "../js/shapes/lib.js";

const near = (a, b) => Math.abs(a - b) < 1e-9;

test("fitFloor is max(0.55, minFont/emojiSize)", () => {
  assert.equal(MIN_SCALE, 0.55);
  assert.equal(fitFloor(44, 14), 0.55);
  assert.equal(fitFloor(20, 14), 0.7);
});

test("chord", () => {
  assert.ok(near(chord(10, 6), 10));
  assert.ok(near(chord(1, 2), 2));
});

test("fitRing: roomy ring keeps count and scale 1", () => {
  assert.deepEqual(fitRing({ r: 200, count: 10, emojiPx: 44, overlap: 0, floor: 0.55 }), { count: 10, scale: 1 });
});

test("fitRing: shrinks to the chord while above the floor", () => {
  const r = 50, count = 10; // chord ≈ 30.9
  const { count: n, scale } = fitRing({ r, count, emojiPx: 44, overlap: 0, floor: 0.55 });
  assert.equal(n, 10);
  assert.ok(near(scale, chord(r, count) / 44));
});

test("fitRing: below the floor, keeps the floor and re-spaces with fewer", () => {
  const { count, scale } = fitRing({ r: 40, count: 24, emojiPx: 44, overlap: 0, floor: 0.55 });
  assert.equal(scale, 0.55);
  assert.ok(chord(40, count) >= 0.55 * 44);
  assert.ok(chord(40, count + 1) < 0.55 * 44);
  assert.ok(count >= 3 && count < 24);
});

test("fitRing: drops the ring when fewer than 3 fit", () => {
  assert.equal(fitRing({ r: 5, count: 12, emojiPx: 44, overlap: 0, floor: 0.55 }).count, 0);
});

test("fitRing: overlap lowers the need", () => {
  const a = fitRing({ r: 50, count: 10, emojiPx: 44, overlap: 0, floor: 0.55 }).scale;
  const b = fitRing({ r: 50, count: 10, emojiPx: 44, overlap: 0.2, floor: 0.55 }).scale;
  assert.ok(b > a);
});

test("fitGap: same-scale neighbours, other-scale neighbour, clamped", () => {
  assert.ok(near(fitGap({ gap: 33, emojiPx: 44, overlap: 0, floor: 0.55 }), 0.75));
  // (1.05 + s)/2 * 44 = 44  ->  s = 0.95
  assert.ok(near(fitGap({ gap: 44, emojiPx: 44, overlap: 0, other: 1.05, floor: 0.55 }), 0.95));
  assert.equal(fitGap({ gap: 500, emojiPx: 44, overlap: 0, floor: 0.55 }), 1);
  assert.equal(fitGap({ gap: 1, emojiPx: 44, overlap: 0, floor: 0.55 }), 0.55);
});

test("fitGap: overlap lowers the need", () => {
  // unit = gap / (emojiPx·(1-overlap)) = 22 / 35.2 = 0.625
  assert.ok(near(fitGap({ gap: 22, emojiPx: 44, overlap: 0.2, floor: 0.55 }), 0.625));
  assert.ok(fitGap({ gap: 22, emojiPx: 44, overlap: 0.2, floor: 0.55 }) > fitGap({ gap: 22, emojiPx: 44, overlap: 0, floor: 0.55 }));
});

test("polygonPoints: vertices on R, sides evenly split, side-major order", () => {
  const sq = polygonPoints(4, 100 * Math.SQRT2, -3 * Math.PI / 4, 4);
  assert.equal(sq.length, 16);
  assert.ok(near(sq[0].x, -100) && near(sq[0].y, -100));
  assert.deepEqual(sq.slice(0, 4).map(p => [Math.round(p.x), Math.round(p.y), p.side, p.i]),
    [[-100, -100, 0, 0], [-50, -100, 0, 1], [0, -100, 0, 2], [50, -100, 0, 3]]);
  assert.ok(near(sq[4].x, 100) && near(sq[4].y, -100) && sq[4].side === 1 && sq[4].i === 0);
  const tri = polygonPoints(3, 10, -Math.PI / 2, 1);
  tri.forEach(p => assert.ok(near(Math.hypot(p.x, p.y), 10)));
});

test("petalOutline and petalSpoke: tip first, then pairs or axis points toward the base", () => {
  const o = petalOutline(100, 400, 0.3, 44);
  assert.deepEqual(o[0], [{ r: 400, phi: 0 }]);
  assert.ok(o.slice(1).every(u => u.length === 2 && near(u[0].r, u[1].r) && near(u[0].phi, -u[1].phi)));
  const s = petalSpoke(100, 400, 100);
  assert.deepEqual(s.map(u => u[0].r), [400, 300, 200, 100]);
});
