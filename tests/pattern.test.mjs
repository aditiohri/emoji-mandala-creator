import { test } from "node:test";
import assert from "node:assert/strict";
import { assignEmoji } from "../js/pattern.js";

const P = ["a", "b", "c", "d", "e", "f", "g", "h"];
const center = { size: 1, kind: "solid", slot: 0 };
const cyc = (size, reverse = false) => ({ size, kind: "cycle", reverse });

test("only the first min(maxEmoji, 6) palette entries appear", () => {
  const groups = [center, cyc(10), cyc(12), cyc(9), cyc(7), cyc(8), cyc(6), cyc(5)];
  for (const maxEmoji of [1, 2, 4, 6, 8]) {
    const { emojiFor } = assignEmoji(groups, P, maxEmoji);
    const allowed = P.slice(0, Math.min(maxEmoji, 6));
    groups.forEach((g, gi) => { for (let i = 0; i < g.size; i++) assert.ok(allowed.includes(emojiFor(gi, i)), `${maxEmoji} ${gi} ${i}`); });
  }
});

test("period: 2 if it divides size, else 3, else solid", () => {
  const { emojiFor } = assignEmoji([cyc(10), cyc(9), cyc(7)], P, 6);
  // size 10 -> p 2, base 0: a b a b ...
  assert.deepEqual([0, 1, 2, 3].map(i => emojiFor(0, i)), ["a", "b", "a", "b"]);
  // size 9 -> p 3, base 1: b c d b c d ...
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => emojiFor(1, i)), ["b", "c", "d", "b", "c", "d"]);
  // size 7 (prime) -> p 1, base 2
  assert.ok([0, 1, 2, 3, 4, 5, 6].every(i => emojiFor(2, i) === "c"));
});

test("a cycle group repeats with its period and the period divides size", () => {
  for (const size of [3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 24]) for (const U of [1, 2, 3, 6]) {
    const { emojiFor } = assignEmoji([cyc(size)], P.slice(0, U), 6);
    const seq = Array.from({ length: size }, (_, i) => emojiFor(0, i));
    const p = new Set(seq).size;
    assert.equal(size % p, 0, `size ${size} U ${U}`);
    for (let i = 0; i + p < size; i++) assert.equal(seq[i], seq[i + p], `size ${size} U ${U}`);
  }
});

test("period 3 needs at least 3 emoji", () => {
  const { emojiFor } = assignEmoji([cyc(9)], ["x", "y"], 6);
  assert.ok([0, 1, 2, 3].every(i => emojiFor(0, i) === "x"));
});

test("slot-less neighbouring groups start on different emoji when U >= 2", () => {
  for (const U of [2, 3, 4, 6]) {
    const groups = [center, cyc(10), cyc(10), cyc(9), cyc(7), cyc(12), cyc(10)];
    const { emojiFor } = assignEmoji(groups, P.slice(0, U), 6);
    // "Differ" = different base emoji (spec §3 Adjacency); with U = 2 two
    // period-2 rings share both emoji, out of phase.
    for (let g = 1; g < groups.length; g++) {
      assert.notEqual(emojiFor(g - 1, 0), emojiFor(g, 0), `U ${U} g ${g}`);
    }
  }
});

test("slots set the base and slotted neighbours differ when U >= maxEmoji", () => {
  const groups = [{ size: 1, kind: "solid", slot: 0 }, { size: 6, kind: "cycle", slot: 2 }, { size: 4, kind: "solid", slot: 4 }];
  const { emojiFor } = assignEmoji(groups, P, 6);
  assert.equal(emojiFor(0, 0), "a");
  assert.equal(emojiFor(1, 0), "c");
  assert.equal(emojiFor(2, 3), "e");
});

test("reverse reverses a period-3 cycle and is a no-op for period 2", () => {
  const { emojiFor } = assignEmoji([cyc(9, false), cyc(9, true)], P, 6);
  // group 1 base 1: forward would be b c d; reversed is b d c
  assert.deepEqual([0, 1, 2, 3].map(i => emojiFor(1, i)), ["b", "d", "c", "b"]);
  const two = assignEmoji([cyc(10, false), cyc(10, true)], P, 6);
  assert.deepEqual([0, 1, 2].map(i => two.emojiFor(1, i)), ["b", "c", "b"]);
});

test("used lists exactly the palette indices drawn", () => {
  // center a(0); ring 10 -> base 1, p 2 -> 1,2; ring 7 -> base 2, solid -> 2
  const { used } = assignEmoji([center, cyc(10), cyc(7)], P, 6);
  assert.deepEqual([...used].sort((x, y) => x - y), [0, 1, 2]);
  // a group fitted with a slot that skips 0
  const skip = assignEmoji([{ size: 6, kind: "cycle", slot: 1 }], P, 6);
  assert.deepEqual([...skip.used].sort((x, y) => x - y), [1, 2]);
});

test("U = 1 and size = 1 work", () => {
  const { emojiFor, used } = assignEmoji([center, cyc(1), cyc(10)], ["x"], 6);
  assert.equal(emojiFor(0, 0), "x"); assert.equal(emojiFor(1, 0), "x"); assert.equal(emojiFor(2, 9), "x");
  assert.deepEqual([...used], [0]);
});

test("deterministic", () => {
  const groups = [center, cyc(12), cyc(9, true)];
  const a = assignEmoji(groups, P, 6), b = assignEmoji(groups, P, 6);
  for (let g = 0; g < 3; g++) for (let i = 0; i < groups[g].size; i++) assert.equal(a.emojiFor(g, i), b.emojiFor(g, i));
});
