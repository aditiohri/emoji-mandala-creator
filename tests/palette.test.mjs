import { test } from "node:test";
import assert from "node:assert/strict";
import { cueText, moveItem } from "../js/palette.js";

test("cueText", () => {
  assert.equal(cueText("Concentric rings", 4, 9), "Concentric rings is using 4 of your 9 emoji — drag one forward to use it");
  assert.equal(cueText("Concentric rings", 3, 3), "Concentric rings is using all 3 of your emoji");
  assert.equal(cueText("Concentric rings", 1, 1), "Concentric rings is using your 1 emoji");
});

test("moveItem moves forward and backward in place", () => {
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepEqual(moveItem(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  const arr = ["a", "b"]; assert.equal(moveItem(arr, 0, 1), arr);
  assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
});
