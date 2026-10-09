import { test } from "node:test";
import assert from "node:assert/strict";
import { cueText, moveItem, focusAfterRemove, rovingNext, chipLabel } from "../js/palette.js";

test("cueText", () => {
  assert.equal(cueText("Concentric rings", 4, 9), "Concentric rings is using 4 of your 9 emoji — move one earlier to use it");
  assert.equal(cueText("Concentric rings", 3, 3), "Concentric rings is using all 3 of your emoji");
  assert.equal(cueText("Concentric rings", 1, 1), "Concentric rings is using your 1 emoji");
});

test("moveItem moves forward and backward in place", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  const arr = ["a", "b"]; assert.equal(moveItem(arr, 0, 1), arr);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
});

test("focusAfterRemove picks the chip now at the same index, else the last", () => {
  assert.equal(focusAfterRemove(2, 4), 2);
  assert.equal(focusAfterRemove(3, 3), 2);
  assert.equal(focusAfterRemove(0, 1), 0);
  assert.equal(focusAfterRemove(0, 0), -1);
});

test("rovingNext moves by key, clamped, no wrap", () => {
  assert.equal(rovingNext(3, "ArrowLeft", 10, 4), 2);
  assert.equal(rovingNext(0, "ArrowLeft", 10, 4), 0);
  assert.equal(rovingNext(3, "ArrowRight", 10, 4), 4);
  assert.equal(rovingNext(9, "ArrowRight", 10, 4), 9);
  assert.equal(rovingNext(5, "ArrowUp", 10, 4), 1);
  assert.equal(rovingNext(2, "ArrowUp", 10, 4), 0);
  assert.equal(rovingNext(5, "ArrowDown", 10, 4), 9);
  assert.equal(rovingNext(8, "ArrowDown", 10, 4), 9);
  assert.equal(rovingNext(5, "Home", 10, 4), 0);
  assert.equal(rovingNext(5, "End", 10, 4), 9);
  assert.equal(rovingNext(5, "x", 10, 4), 5);
});

test("chipLabel tells duplicates apart by position", () => {
  assert.equal(chipLabel("🌸", 2, 8), "🌸, position 3 of 8");
});
