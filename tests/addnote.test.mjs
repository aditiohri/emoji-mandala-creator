import { test } from "node:test";
import assert from "node:assert/strict";
import { addedNote } from "../js/addnote.js";

test("first copy: just says it was added", () => {
  assert.equal(addedNote("🌸", ["✨", "🌸"]), "🌸 added");
});

test("repeat copies: says how many are in the palette", () => {
  assert.equal(addedNote("🌸", ["🌸", "🔥", "🌸"]), "🌸 added (×2 in your palette)");
  assert.equal(addedNote("🌸", ["🌸", "🌸", "🌸"]), "🌸 added (×3 in your palette)");
});

test("counts only identical emoji", () => {
  assert.equal(addedNote("❤", ["❤️", "❤"]), "❤ added");
});
