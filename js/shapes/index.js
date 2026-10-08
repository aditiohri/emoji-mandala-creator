import rings from "./rings.js";

// Ordered list of shapes, as shown in the UI.
export const SHAPES = [rings];

export function getShape(id){
  return SHAPES.find(s => s.id === id) ?? SHAPES[0];
}
