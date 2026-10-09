import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY, MAX_SAVED, MAX_NAME,
  cleanName, parseSaved, loadSaved, storeSaved, findSame,
  autoName, addPalette, renamePalette, removePalette, restorePalette
} from "../js/savedPalettes.js";

function fakeStorage({ throwOnGet = false, throwOnSet = false } = {}) {
  const data = {};
  return {
    data,
    getItem(k) { if (throwOnGet) throw new Error("denied"); return k in data ? data[k] : null; },
    setItem(k, v) { if (throwOnSet) throw new Error("QuotaExceededError"); data[k] = String(v); },
  };
}

const FAMILY = "👨‍👩‍👧"; // one ZWJ cluster, five code points
const P1 = ["✨", "🌸", "🔥", "🌊"];
const P2 = ["🌙", "🍃", "💠"];

test("parseSaved: bad JSON or a non-array is an empty list", () => {
  assert.deepEqual(parseSaved("{not json"), []);
  assert.deepEqual(parseSaved('{"id":"a"}'), []);
  assert.deepEqual(parseSaved("null"), []);
});

test("parseSaved: bad entries and repeated ids are dropped, good ones kept in order", () => {
  const raw = JSON.stringify([
    { id: "a", name: "A", emoji: ["✨"] },
    { id: "b", name: "", emoji: ["✨"] },          // empty name
    { id: "c", name: "C", emoji: [] },             // no emoji
    { id: "d", name: "D", emoji: ["✨", 3] },      // not all strings
    null,
    { id: "a", name: "A again", emoji: ["🌸"] },   // repeated id
    { id: "e", name: "  E  ", emoji: [FAMILY, "🌸"] },
  ]);
  assert.deepEqual(parseSaved(raw), [
    { id: "a", name: "A", emoji: ["✨"] },
    { id: "e", name: "E", emoji: [FAMILY, "🌸"] },
  ]);
});

test("parseSaved: keeps at most MAX_SAVED entries", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ id: "x" + i, name: "N" + i, emoji: ["✨"] }));
  assert.equal(parseSaved(JSON.stringify(many)).length, MAX_SAVED);
});

test("loadSaved / storeSaved round-trip; ZWJ emoji survive", () => {
  const s = fakeStorage();
  assert.deepEqual(loadSaved(s), []);
  const list = [{ id: "a", name: FAMILY, emoji: [FAMILY, "✨"] }];
  assert.equal(storeSaved(list, s), true);
  assert.ok(STORAGE_KEY in s.data);
  assert.deepEqual(loadSaved(s), list);
});

test("loadSaved is [] when storage throws; storeSaved reports a failed write", () => {
  assert.deepEqual(loadSaved(fakeStorage({ throwOnGet: true })), []);
  const warn = console.warn; console.warn = () => {};
  try { assert.equal(storeSaved([], fakeStorage({ throwOnSet: true })), false); }
  finally { console.warn = warn; }
});

test("addPalette: auto-names from the first three emoji, newest first, copies the array", () => {
  const emoji = [...P1];
  const r = addPalette([], emoji, "id1");
  assert.equal(r.status, "added");
  assert.deepEqual(r.list, [{ id: "id1", name: "✨🌸🔥", emoji: P1 }]);
  emoji.push("🦋");
  assert.deepEqual(r.list[0].emoji, P1);
  const r2 = addPalette(r.list, P2, "id2");
  assert.deepEqual(r2.list.map(p => p.id), ["id2", "id1"]);
  assert.equal(r2.entry.name, "🌙🍃💠");
});

test("addPalette: a short palette is named by what it has; ZWJ clusters stay whole", () => {
  assert.equal(addPalette([], ["🌸"], "a").entry.name, "🌸");
  assert.equal(addPalette([], [FAMILY, "✨", FAMILY, "🔥"], "b").entry.name, FAMILY + "✨" + FAMILY);
});

test("addPalette: same first three emoji -> ' 2', ' 3'", () => {
  let list = addPalette([], P1, "a").list;
  list = addPalette(list, ["✨", "🌸", "🔥"], "b").list;
  list = addPalette(list, ["✨", "🌸", "🔥", "🦋"], "c").list;
  assert.deepEqual(list.map(p => p.name), ["✨🌸🔥 3", "✨🌸🔥 2", "✨🌸🔥"]);
});

test("addPalette: the identical list in the same order saves nothing and names the existing entry", () => {
  const { list } = addPalette([], P1, "a");
  const r = addPalette(list, [...P1], "b");
  assert.equal(r.status, "duplicate");
  assert.equal(r.entry.id, "a");
  assert.equal(r.list, list);
  // A different order is a different palette.
  assert.equal(addPalette(list, ["🌸", "✨", "🔥", "🌊"], "c").status, "added");
});

test("addPalette: empty palette -> 'empty'; full list -> 'full' (a duplicate still says duplicate)", () => {
  assert.equal(addPalette([], [], "a").status, "empty");
  let list = [];
  for (let i = 0; i < MAX_SAVED; i++) list = addPalette(list, ["✨", String(i)], "id" + i).list;
  assert.equal(list.length, MAX_SAVED);
  const r = addPalette(list, ["🌸"], "new");
  assert.equal(r.status, "full");
  assert.equal(r.list, list);
  assert.equal(addPalette(list, ["✨", "0"], "dup").status, "duplicate");
});

test("cleanName: trims and caps at MAX_NAME characters without splitting an emoji", () => {
  assert.equal(cleanName("  hi  "), "hi");
  assert.equal(cleanName("   "), "");
  assert.equal(cleanName("a".repeat(40)).length, MAX_NAME);
  const cut = cleanName(FAMILY.repeat(30));
  assert.equal(cut, FAMILY.repeat(MAX_NAME));
});

test("renamePalette: trims, rejects empty, keeps names unique", () => {
  let list = addPalette([], P1, "a").list;
  list = addPalette(list, P2, "b").list;
  let r = renamePalette(list, "a", "  Sunset  ");
  assert.equal(r.changed, true);
  assert.equal(r.entry.name, "Sunset");
  list = r.list;
  r = renamePalette(list, "a", "   ");
  assert.equal(r.changed, false);
  assert.equal(r.list, list);
  assert.equal(list.find(p => p.id === "a").name, "Sunset");
  r = renamePalette(list, "b", "Sunset");
  assert.equal(r.entry.name, "Sunset 2");
  assert.equal(renamePalette(list, "a", "Sunset").changed, false); // same name, no change
  assert.equal(renamePalette(list, "zzz", "X").changed, false);
});

test("removePalette + restorePalette put it back at the same position", () => {
  let list = [];
  for (const [id, e] of [["c", ["🍃"]], ["b", ["🌸"]], ["a", ["✨"]]]) list = addPalette(list, e, id).list;
  assert.deepEqual(list.map(p => p.id), ["a", "b", "c"]);
  const r = removePalette(list, "b");
  assert.deepEqual(r.list.map(p => p.id), ["a", "c"]);
  assert.deepEqual(r.removed, { entry: list[1], index: 1 });
  assert.deepEqual(restorePalette(r.list, r.removed).map(p => p.id), ["a", "b", "c"]);
  // Restoring twice does nothing; an unknown id removes nothing.
  const back = restorePalette(r.list, r.removed);
  assert.equal(restorePalette(back, r.removed), back);
  assert.equal(removePalette(list, "zzz").removed, null);
});

test("autoName ignores names only when they differ", () => {
  const list = [{ id: "x", name: "✨🌸🔥 2", emoji: ["✨"] }];
  assert.equal(autoName(list, P1), "✨🌸🔥");
});

test("findSame matches exact order and length only", () => {
  const list = addPalette([], P1, "a").list;
  assert.equal(findSame(list, P1).id, "a");
  assert.equal(findSame(list, P1.slice(0, 3)), undefined);
});
