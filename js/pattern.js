// Emoji assignment. Slice 1 has only the legacy mode, which reproduces the
// original colouring exactly; slice 2 replaces it with assignEmoji().
export function assignLegacy(groups, palette){
  const len = palette.length;
  const slotFor = (g, i) => {
    const ring = groups[g].ring;
    return ring === undefined ? 0 : ((ring*31) % len + i) % len;
  };
  const used = new Set();
  groups.forEach((g, gi) => { for (let i=0; i<g.size; i++) used.add(slotFor(gi, i)); });
  return { emojiFor: (g, i) => palette[slotFor(g, i)], used };
}
