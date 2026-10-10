import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardLines, limitMessage, mirrorNote, noteAfterEdit, cardFilename, shareFields,
  cardLabel, cardLayout, MAX_LINE,
} from "../js/card.js";

// 0.5 em per grapheme: the size is read from the font string.
const measure = (text, font) => Array.from(text).length * parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)[1]) * 0.5;
const wide = (text, font) => measure(text, font) * 1.6;
const mid = (text, font) => measure(text, font) * 1.2;

// --- cardLines -------------------------------------------------------------

test("cardLines: trims and returns two lines", () => {
  assert.deepEqual(cardLines("  Happy birthday, Maya!  \n love, Didi "), ["Happy birthday, Maya!", "love, Didi"]);
});

test("cardLines: empty message gives two empty lines", () => {
  assert.deepEqual(cardLines(""), ["", ""]);
  assert.deepEqual(cardLines("  \n  "), ["", ""]);
});

test("cardLines: a third line is ignored, each line cut to 60 characters", () => {
  assert.deepEqual(cardLines("a\nb\nc"), ["a", "b"]);
  const [l1] = cardLines("x".repeat(80));
  assert.equal(l1.length, MAX_LINE);
});

test("cardLines: if line 1 is empty, line 2 moves up", () => {
  assert.deepEqual(cardLines("\nlove, Didi"), ["love, Didi", ""]);
});

test("cardLines: handles CRLF and counts emoji as one character", () => {
  assert.deepEqual(cardLines("hi\r\nbye"), ["hi", "bye"]);
  const [l1] = cardLines("🎂".repeat(70));
  assert.equal(Array.from(l1).length, MAX_LINE);
});

// --- limitMessage (what the textarea keeps) ---------------------------------

test("limitMessage: short text is untouched, spaces kept", () => {
  assert.deepEqual(limitMessage("Happy \nbirthday "), { text: "Happy \nbirthday ", cut: false });
});

test("limitMessage: third line dropped and reported", () => {
  assert.deepEqual(limitMessage("a\nb\nc"), { text: "a\nb", cut: true });
});

test("limitMessage: long line cut to 60 and reported", () => {
  const r = limitMessage("y".repeat(75) + "\nok");
  assert.equal(r.text, "y".repeat(60) + "\nok");
  assert.equal(r.cut, true);
});

// --- share note -------------------------------------------------------------

test("mirrorNote: both lines joined with a newline; empty message gives empty note", () => {
  assert.equal(mirrorNote("Happy birthday!\nlove, Didi"), "Happy birthday!\nlove, Didi");
  assert.equal(mirrorNote("only one"), "only one");
  assert.equal(mirrorNote(""), "");
});

test("noteAfterEdit: editing stops mirroring; clearing refills from the message", () => {
  assert.deepEqual(noteAfterEdit("my own words", "Hi\nbye"), { note: "my own words", noteMirrors: false });
  assert.deepEqual(noteAfterEdit("", "Hi\nbye"), { note: "Hi\nbye", noteMirrors: true });
  assert.deepEqual(noteAfterEdit("   ", "Hi"), { note: "Hi", noteMirrors: true });
});

// --- filename ----------------------------------------------------------------

const D = new Date("2026-10-09T12:00:00Z");

test("cardFilename: slug from line 1", () => {
  assert.equal(cardFilename("Happy birthday, Maya! 🎂", D), "happy-birthday-maya.png");
});

test("cardFilename: keeps accents and non-Latin letters and digits", () => {
  assert.equal(cardFilename("Café déjà-vu 2027", D), "café-déjà-vu-2027.png");
  assert.equal(cardFilename("जन्मदिन मुबारक", D), "जन्मदिन-मुबारक.png");
});

test("cardFilename: nothing left falls back to the dated name", () => {
  assert.equal(cardFilename("", D), "mandala-2026-10-09.png");
  assert.equal(cardFilename("🎂🎉", D), "mandala-2026-10-09.png");
  assert.equal(cardFilename(" !!! ", D), "mandala-2026-10-09.png");
});

test("cardFilename: cut to 40 characters at a hyphen where possible", () => {
  const name = cardFilename("happy birthday to the very best friend anyone could have", D);
  const slug = name.replace(/\.png$/, "");
  assert.ok(slug.length <= 40);
  assert.equal(slug, "happy-birthday-to-the-very-best-friend");
  assert.ok(!slug.endsWith("-"));
});

test("cardFilename: one long word is cut hard at 40", () => {
  assert.equal(cardFilename("z".repeat(55), D), "z".repeat(40) + ".png");
});

// --- share fields -------------------------------------------------------------

test("shareFields: no message uses the default title and no text", () => {
  assert.deepEqual(shareFields("", "", true), { title: "Emoji mandala", text: undefined });
});

test("shareFields: mirrored note follows the message", () => {
  assert.deepEqual(shareFields("Hi Maya\nlove, Didi", "stale", true), { title: "Hi Maya", text: "Hi Maya\nlove, Didi" });
});

test("shareFields: edited note is sent as written", () => {
  assert.deepEqual(shareFields("Hi Maya", "Open this one!", false), { title: "Hi Maya", text: "Open this one!" });
});

test("shareFields: empty edited note omits text", () => {
  assert.deepEqual(shareFields("Hi Maya", "  ", false), { title: "Hi Maya", text: undefined });
});

// --- accessible label ------------------------------------------------------------

test("cardLabel: quotes both lines with a slash; empty message gives empty string", () => {
  assert.equal(cardLabel(["Happy birthday, Maya!", "love, Didi"]), 'Greeting card: "Happy birthday, Maya! / love, Didi". ');
  assert.equal(cardLabel(["Hi", ""]), 'Greeting card: "Hi". ');
  assert.equal(cardLabel(["", ""]), "");
});

// --- layout: caption -----------------------------------------------------------------

test("caption: short line sits at 76 %, one row at 64 px", () => {
  const L = cardLayout(["Happy birthday, Maya!", "love, Didi"], "caption", measure);
  assert.deepEqual(L.area, { cx: 500, cy: 400, size: 760 });
  assert.equal(L.runs.length, 2);
  const [r1, r2] = L.runs;
  assert.equal(r1.text, "Happy birthday, Maya!");
  assert.equal(r1.size, 64);
  assert.equal(r1.x, 500);
  assert.equal(r2.text, "love, Didi");
  assert.equal(r2.size, 40);
  assert.ok(r2.y > r1.y);
  assert.match(r1.font, /Fraunces/);
  assert.match(r2.font, /Sora/);
  assert.match(r1.font, /Apple Color Emoji/);
});

test("caption: line 1 shrinks in 2 px steps until it fits 900 px", () => {
  // 40 chars * 0.5 em: fits 900 at 45 px => first even size is 44.
  const L = cardLayout(["a".repeat(40), ""], "caption", measure);
  assert.equal(L.runs[0].size, 44);
  assert.ok(measure(L.runs[0].text, L.runs[0].font) <= 900);
  assert.deepEqual(L.area, { cx: 500, cy: 400, size: 760 });
});

test("caption: line 1 too long at 40 px wraps to two rows and the mandala shrinks to 70 %", () => {
  const text = "wishing you a wonderful birthday full of joy and cake today friend";
  const l1 = text.slice(0, 60);
  const L = cardLayout([l1, "xo"], "caption", mid);
  assert.deepEqual(L.area, { cx: 500, cy: 370, size: 700 });
  const rows = L.runs.filter(r => r.size === 40 && /Fraunces/.test(r.font));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text + " " + rows[1].text, l1);
  for (const r of rows) assert.ok(mid(r.text, r.font) <= 900);
  assert.ok(rows[1].y > rows[0].y);
  const sign = L.runs.find(r => /Sora/.test(r.font));
  assert.ok(sign.y > rows[1].y);
});

test("caption: wrapping breaks a word when no space fits", () => {
  const l1 = "w".repeat(60);
  const L = cardLayout([l1, ""], "caption", mid);
  const rows = L.runs.filter(r => /Fraunces/.test(r.font));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text + rows[1].text, l1);
  assert.ok(mid(rows[0].text, rows[0].font) <= 900);
});

test("caption: line 2 shrinks to 28 px, then is cut with an ellipsis", () => {
  const L = cardLayout(["Hi", "s".repeat(60)], "caption", wide);
  const r2 = L.runs.find(r => /Sora/.test(r.font));
  assert.equal(r2.size, 28);
  assert.ok(r2.text.endsWith("…"));
  assert.ok(wide(r2.text, r2.font) <= 800);
});

test("caption: line 2 sits lower when line 1 wrapped", () => {
  const long = "m".repeat(60);
  const a = cardLayout(["Hi", "bye"], "caption", mid).runs.find(r => /Sora/.test(r.font));
  const b = cardLayout([long, "bye"], "caption", mid).runs.find(r => /Sora/.test(r.font));
  assert.ok(b.y > a.y);
});

test("caption: line 1 only gives one run", () => {
  assert.equal(cardLayout(["Hello", ""], "caption", measure).runs.length, 1);
});

test("empty message: no area change, no runs", () => {
  for (const id of ["caption", "edge"]) {
    const L = cardLayout(["", ""], id, measure);
    assert.equal(L.area, null);
    assert.deepEqual(L.runs, []);
  }
});

// --- layout: around the edge --------------------------------------------------------

const arcOf = (runs) => {
  const a = runs.map(r => r.theta);
  return Math.abs(a[a.length - 1] - a[0]);
};

test("edge: mandala at 72 %, centred", () => {
  const L = cardLayout(["Happy birthday!", ""], "edge", measure);
  assert.deepEqual(L.area, { cx: 500, cy: 500, size: 720 });
});

test("edge: top line is per glyph, starts at 58 px and reads left to right across the top", () => {
  const L = cardLayout(["Happy", ""], "edge", measure);
  assert.equal(L.runs.length, 5);
  assert.deepEqual(L.runs.map(r => r.glyph).join(""), "Happy");
  assert.equal(L.runs[0].size, 58);
  // x increases left to right; the middle glyph is the topmost point
  for (let i = 1; i < L.runs.length; i++) assert.ok(L.runs[i].x > L.runs[i - 1].x);
  const mid = L.runs[2];
  assert.ok(Math.abs(mid.x - 500) < 20);
  assert.ok(mid.y < 500 - 400 && mid.y > 500 - 440);
  // glyph tops face outward: the middle glyph is upright, the ends tilt away
  assert.ok(Math.abs(mid.angle) < 0.1);
  assert.ok(L.runs[0].angle < 0 && L.runs[4].angle > 0);
});

test("edge: 60 characters fit within 160° at 32 px", () => {
  const L = cardLayout(["a".repeat(60), ""], "edge", measure);
  assert.equal(L.runs.length, 60);
  assert.ok(L.runs[0].size >= 32);
  assert.ok(arcOf(L.runs) <= (160 * Math.PI) / 180 + 1e-9);
});

test("edge: glyph is measured per grapheme so emoji are not split", () => {
  const L = cardLayout(["Hi 👩‍👩‍👧‍👦", ""], "edge", measure);
  assert.equal(L.runs.length, 4);
  assert.equal(L.runs[3].glyph, "👩‍👩‍👧‍👦");
});

test("edge: bottom line is upright and runs counter-clockwise, left to right", () => {
  const L = cardLayout(["Hi", "love, Didi"], "edge", measure);
  const bottom = L.runs.filter(r => /Sora/.test(r.font));
  assert.equal(bottom.length, 10);
  assert.equal(bottom[0].size, 40);
  for (let i = 1; i < bottom.length; i++) {
    assert.ok(bottom[i].x > bottom[i - 1].x, "reads left to right");
    assert.ok(bottom[i].theta < bottom[i - 1].theta, "path runs counter-clockwise");
  }
  for (const r of bottom) assert.ok(r.y > 500, "below the centre");
  // upright at the bottom, tops face the centre: left half tilts clockwise (+), right half counter-clockwise (-)
  assert.ok(bottom[0].angle > 0 && bottom[bottom.length - 1].angle < 0);
  assert.ok(Math.abs(bottom[4].angle) < 0.15);
});

test("edge: bottom line shrinks toward 28 px within 140°", () => {
  const L = cardLayout(["Hi", "s".repeat(60)], "edge", measure);
  const bottom = L.runs.filter(r => /Sora/.test(r.font));
  assert.ok(bottom[0].size >= 28 && bottom[0].size < 40);
  assert.ok(arcOf(bottom) <= (140 * Math.PI) / 180 + 1e-9);
});

test("edge: text too long even at the minimum size is cut with an ellipsis", () => {
  const L = cardLayout(["Hi", "s".repeat(60)], "edge", wide);
  const bottom = L.runs.filter(r => /Sora/.test(r.font));
  assert.equal(bottom[bottom.length - 1].glyph, "…");
  assert.ok(arcOf(bottom) <= (140 * Math.PI) / 180 + 1e-9);
});
