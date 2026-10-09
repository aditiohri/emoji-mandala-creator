// Plain-language description of the mandala for screen readers.
// Pure; `s` is the app state, `shape` its current shape, `params` that shape's values.
export function describeMandala(s, shape, params){
  const parts = shape.controls.map(c => `${c.label} ${(c.format ?? String)(params[c.key])}`);
  if (shape.alternate) parts.push(`${shape.alternate.label} ${params.alternate ? "on" : "off"}`);
  parts.push(`Rotation ${s.rotation}°`, `Emoji size ${s.emojiSize}px`,
    s.centerMode === "empty" ? "Empty center" : "Center emoji");
  if (s.faceOutward) parts.push("Emoji rotated outward");
  return `${shape.label}: ${parts.join(", ")}`;
}
