// Confirmation text for the Browse dialog after an emoji is added.
// Pure; `palette` already includes the new emoji.
export function addedNote(emoji, palette){
  const n = palette.filter(e => e === emoji).length;
  return n > 1 ? `${emoji} added (×${n} in your palette)` : `${emoji} added`;
}
