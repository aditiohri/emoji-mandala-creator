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

// Emoji assignment (spec §3): each group gets a symmetric repeating pattern
// drawn from the first few palette entries.
export function assignEmoji(groups, palette, maxEmoji){
  const use = palette.slice(0, Math.min(maxEmoji, palette.length, 6));
  const U = use.length;
  const plan = groups.map((g, gi) => {
    let p = 1;
    if (g.kind === "cycle") p = [2, 3].find(c => c <= U && g.size % c === 0) ?? 1;
    return { base: (g.slot ?? gi) % U, p, reverse: !!g.reverse };
  });
  const slotFor = (g, i) => {
    const { base, p, reverse } = plan[g];
    const k = reverse ? (p - i % p) % p : i % p;
    return (base + k) % U;
  };
  const used = new Set();
  groups.forEach((g, gi) => { for (let i = 0; i < g.size; i++) used.add(slotFor(gi, i)); });
  return { emojiFor: (g, i) => use[slotFor(g, i)], used };
}
