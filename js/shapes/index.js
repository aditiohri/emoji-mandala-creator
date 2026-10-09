import rings from "./rings.js";
import spiral from "./spiral.js";
import lotus from "./lotus.js";

// Ordered list of shapes, as shown in the UI.
export const SHAPES = [rings, spiral, lotus];

export function getShape(id){
  return SHAPES.find(s => s.id === id) ?? SHAPES[0];
}

// A shape's control defaults, plus `alternate` if the shape supports it.
export function defaultParams(shape){
  const p = Object.fromEntries(shape.controls.map(c => [c.key, c.default]));
  if (shape.alternate) p.alternate = shape.alternate.default;
  return p;
}

// Random values for Shuffle: each control within its `shuffle` range (or its
// full range), on its step grid; random Alternate if supported.
// `rand` returns [0, 1), like Math.random.
export function randomParams(shape, rand){
  const p = {};
  for (const c of shape.controls){
    const [lo, hi] = c.shuffle ?? [c.min, c.max];
    const steps = Math.round((hi - lo) / c.step);
    const v = lo + Math.floor(rand() * (steps + 1)) * c.step;
    p[c.key] = Number(v.toFixed(6));
  }
  if (shape.alternate) p.alternate = rand() > 0.4;
  return p;
}
