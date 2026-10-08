import { test } from "node:test";
import assert from "node:assert/strict";
import { assignLegacy } from "../js/pattern.js";

const P = ["a", "b", "c", "d", "e", "f", "g", "h"];

test("center gets palette[0]", () => {
  const { emojiFor } = assignLegacy([{ size: 1, kind: "solid", slot: 0 }], P);
  assert.equal(emojiFor(0, 0), "a");
});

test("ring colouring is today's formula", () => {
  const groups = [{ size: 1, kind: "solid", slot: 0 }, { size: 10, kind: "cycle", reverse: false, ring: 1 }, { size: 10, kind: "cycle", reverse: true, ring: 2 }];
  const { emojiFor } = assignLegacy(groups, P);
  for (const [g, ring] of [[1, 1], [2, 2]]) for (let s = 0; s < 10; s++)
    assert.equal(emojiFor(g, s), P[((ring * 31) % 8 + s) % 8]);
});

test("legacy colouring ignores group position", () => {
  const ring1 = { size: 5, kind: "cycle", reverse: false, ring: 1 };
  const withCenter = assignLegacy([{ size: 1, kind: "solid", slot: 0 }, ring1], P);
  const noCenter = assignLegacy([ring1], P);
  for (let s = 0; s < 5; s++) assert.equal(withCenter.emojiFor(1, s), noCenter.emojiFor(0, s));
});

test("used lists exactly the palette indices drawn", () => {
  // ring 1 offset = 31 % 8 = 7; size 3 -> indices 7, 0, 1
  const { used } = assignLegacy([{ size: 3, kind: "cycle", reverse: false, ring: 1 }], P);
  assert.deepEqual([...used].sort((a, b) => a - b), [0, 1, 7]);
});

test("single-emoji palette", () => {
  const { emojiFor, used } = assignLegacy([{ size: 1, kind: "solid", slot: 0 }, { size: 4, kind: "cycle", reverse: false, ring: 3 }], ["x"]);
  assert.equal(emojiFor(0, 0), "x"); assert.equal(emojiFor(1, 3), "x");
  assert.deepEqual([...used], [0]);
});
