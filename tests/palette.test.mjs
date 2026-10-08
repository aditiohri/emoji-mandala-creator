import { test } from "node:test";
import assert from "node:assert/strict";
import { cueText } from "../js/palette.js";

test("cueText", () => {
  assert.equal(cueText("Concentric rings", 4, 9), "Concentric rings is using 4 of your 9 emoji — drag one forward to use it");
  assert.equal(cueText("Concentric rings", 3, 3), "Concentric rings is using all 3 of your emoji");
  assert.equal(cueText("Concentric rings", 1, 1), "Concentric rings is using your 1 emoji");
});
