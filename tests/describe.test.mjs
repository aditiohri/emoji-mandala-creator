import { test } from "node:test";
import assert from "node:assert/strict";
import { describeMandala } from "../js/describe.js";

const shape = {
  label: "Lotus",
  controls: [
    { key: "layers", label: "Layers" },
    { key: "width", label: "Petal width", format: v => v + "%" },
  ],
  alternate: { label: "Interleave petal layers" },
};
const s = { rotation: 30, emojiSize: 44, centerMode: "emoji", faceOutward: false };

test("names the shape and each control with its formatted value", () => {
  assert.equal(
    describeMandala(s, shape, { layers: 2, width: 80, alternate: true }),
    "Lotus: Layers 2, Petal width 80%, Interleave petal layers on, Rotation 30°, Emoji size 44px, Center emoji"
  );
});

test("empty center, outward emoji and an off switch are said", () => {
  const text = describeMandala({ ...s, centerMode: "empty", faceOutward: true }, shape, { layers: 1, width: 40, alternate: false });
  assert.match(text, /Interleave petal layers off/);
  assert.match(text, /Empty center, Emoji rotated outward$/);
});

test("a shape without the alternate switch leaves it out", () => {
  const { alternate, ...plain } = shape;
  assert.doesNotMatch(describeMandala(s, plain, { layers: 2, width: 80 }), /Interleave/);
});
