// Saved palettes: pure list functions plus localStorage load/store.
// A list is an array of { id, name, emoji } kept in display order (newest first).
// No DOM here; the UI lives in savedPalettesUI.js.

export const STORAGE_KEY = "mandala.savedPalettes";
export const MAX_SAVED = 20;
export const MAX_NAME = 24; // characters as people see them (grapheme clusters)

// Split into user-perceived characters so a cut never breaks a ZWJ emoji.
function graphemes(text) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(s => s.segment);
}

// Trim and cap a name; "" means unusable.
export function cleanName(name) {
  if (typeof name !== "string") return "";
  return graphemes(name.trim()).slice(0, MAX_NAME).join("").trim();
}

function validEntry(e) {
  return !!e && typeof e === "object" &&
    typeof e.id === "string" && e.id !== "" &&
    cleanName(e.name) !== "" &&
    Array.isArray(e.emoji) && e.emoji.length >= 1 &&
    e.emoji.every(x => typeof x === "string" && x !== "");
}

// Stored text -> list. Bad JSON or shape -> []; bad or repeated-id entries are dropped.
export function parseSaved(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { return []; }
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const list = [];
  for (const e of data) {
    if (!validEntry(e) || seen.has(e.id)) continue;
    seen.add(e.id);
    list.push({ id: e.id, name: cleanName(e.name), emoji: [...e.emoji] });
    if (list.length >= MAX_SAVED) break;
  }
  return list;
}

export function loadSaved(storage) {
  try {
    const raw = (storage || globalThis.localStorage).getItem(STORAGE_KEY);
    return raw ? parseSaved(raw) : [];
  } catch (e) {
    return [];
  }
}

// Returns whether the write stuck (it throws when the storage quota is full).
export function storeSaved(list, storage) {
  try {
    (storage || globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn("Failed to save palettes:", e);
    return false;
  }
}

export function sameEmoji(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// The saved entry with exactly these emoji in this order, or undefined.
export function findSame(list, emoji) {
  return list.find(p => sameEmoji(p.emoji, emoji));
}

// `base`, or "base 2", "base 3"... whichever no other entry (except `exceptId`) uses.
export function uniqueName(list, base, exceptId) {
  const taken = new Set(list.filter(p => p.id !== exceptId).map(p => p.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const name = `${base} ${n}`;
    if (!taken.has(name)) return name;
  }
}

// Default name: the palette's first three emoji, made unique.
export function autoName(list, emoji) {
  return uniqueName(list, emoji.slice(0, 3).join(""));
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Save `emoji` (copied as is) at the top of the list.
// status: "added" | "duplicate" (entry = the existing one) | "full" | "empty".
export function addPalette(list, emoji, id = newId()) {
  if (!Array.isArray(emoji) || emoji.length === 0) return { list, status: "empty" };
  const same = findSame(list, emoji);
  if (same) return { list, status: "duplicate", entry: same };
  if (list.length >= MAX_SAVED) return { list, status: "full" };
  const entry = { id, name: autoName(list, emoji), emoji: [...emoji] };
  return { list: [entry, ...list], status: "added", entry };
}

// changed is false (list untouched) when the id is unknown or the name is empty after trimming.
export function renamePalette(list, id, name) {
  const entry = list.find(p => p.id === id);
  const clean = cleanName(name);
  if (!entry || clean === "") return { list, changed: false, entry };
  const finalName = uniqueName(list, clean, id);
  if (finalName === entry.name) return { list, changed: false, entry };
  const renamed = { ...entry, name: finalName };
  return { list: list.map(p => (p.id === id ? renamed : p)), changed: true, entry: renamed };
}

// removed = { entry, index } for undo, or null if the id is unknown.
export function removePalette(list, id) {
  const index = list.findIndex(p => p.id === id);
  if (index < 0) return { list, removed: null };
  return { list: list.filter(p => p.id !== id), removed: { entry: list[index], index } };
}

// Put a removed entry back where it was. No-op if it is already there or the list is full.
export function restorePalette(list, removed) {
  if (!removed || list.some(p => p.id === removed.entry.id) || list.length >= MAX_SAVED) return list;
  const next = [...list];
  next.splice(Math.min(removed.index, next.length), 0, removed.entry);
  return next;
}
