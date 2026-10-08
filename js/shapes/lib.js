// Shared geometry for shapes. Pure; no DOM, no state.
export function polar(r, angle){
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}
