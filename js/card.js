// Greeting card: message text, layout maths, filename and share fields.
// Pure (no DOM) so it can be unit-tested in Node; draw.js does the drawing.

import { getLuminance, hexToRgb } from "./backgrounds.js";

export const MAX_LINE = 60;
export const INK_LIGHT = "#f2ecdd", INK_DARK = "#241c38";
export const DEFAULT_TITLE = "Emoji mandala";
export const LAYOUTS = [
  { id: "caption", label: "Caption" },
  { id: "edge", label: "Around the edge" },
];

const EMOJI_FONTS = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'";
const font1 = px => `600 ${px}px Fraunces, ${EMOJI_FONTS}, serif`;
const font2 = px => `500 ${px}px Sora, ${EMOJI_FONTS}, sans-serif`;

const chars = text => Array.from(text);

const graphemes = text =>
  typeof Intl !== "undefined" && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), s => s.segment)
    : chars(text);

// --- text ------------------------------------------------------------------

const clip = line => chars(line).slice(0, MAX_LINE).join("");

// [line1, line2]: trimmed, at most 2 lines of 60 characters; if line 1 is
// empty, line 2 moves up.
export function cardLines(text){
  const raw = String(text || "").split(/\r\n|\r|\n/).slice(0, 2).map(l => clip(l.trim()));
  while (raw.length < 2) raw.push("");
  return raw[0] === "" ? [raw[1], ""] : raw;
}

// What the message box keeps: two lines of 60 characters, spaces untouched.
export function limitMessage(text){
  const lines = String(text || "").split(/\r\n|\r|\n/);
  const kept = lines.slice(0, 2).map(clip);
  const out = kept.join("\n");
  const cut = lines.length > 2 || kept.some((l, i) => l !== lines[i]);
  return { text: out, cut };
}

// Accessible name of a card, or "" when there is no message.
export function cardLabel(lines){
  const parts = lines.filter(Boolean);
  return parts.length ? `Greeting card: "${parts.join(" / ")}". ` : "";
}

// --- share note and filename -----------------------------------------------

export function mirrorNote(message){
  return cardLines(message).filter(Boolean).join("\n");
}

// The note box was edited: stop mirroring, unless it was cleared.
export function noteAfterEdit(value, message){
  if (value.trim() === "") return { note: mirrorNote(message), noteMirrors: true };
  return { note: value, noteMirrors: false };
}

export function shareFields(message, note, mirrored){
  const [line1] = cardLines(message);
  const text = mirrored ? mirrorNote(message) : note || "";
  return { title: line1 || DEFAULT_TITLE, text: text.trim() ? text : undefined };
}

export function cardFilename(line1, date = new Date()){
  let slug = String(line1 || "").normalize("NFC").toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "");
  if (slug.length > 40){
    const head = slug.slice(0, 40);
    slug = slug[40] === "-" ? head : head.includes("-") ? head.slice(0, head.lastIndexOf("-")) : head;
    slug = slug.replace(/-+$/g, "");
  }
  return slug ? slug + ".png" : "mandala-" + date.toISOString().slice(0, 10) + ".png";
}

// --- contrast -----------------------------------------------------------------

function contrast(hexA, hexB){
  const lum = h => { const c = hexToRgb(h); return getLuminance(c.r, c.g, c.b); };
  const [a, b] = [lum(hexA), lum(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Does the text need a halo? One ink can't be right across a gradient or a photo,
// and on a solid it only reads if it clears 4.5:1 (Coral, Violet and Gold don't).
export function needsHalo(background, inkIsLight){
  if (!background) return false;
  if (background.type === "gradient" || background.type === "image") return true;
  if (background.type === "solid" && background.color)
    return contrast(inkIsLight ? INK_LIGHT : INK_DARK, background.color) < 4.5;
  return false;
}

// --- layout (units are a 1000 x 1000 canvas) -------------------------------

const rad = deg => deg * Math.PI / 180;

function steps(from, to, k = 1){
  const out = [];
  for (let s = Math.round(from * k); s >= Math.round(to * k); s -= 2) out.push(s);
  return out;
}

// Widest size in `sizes` at which the text fits `maxW`, or null.
function fitSize(text, fontFn, sizes, maxW, measure){
  return sizes.find(s => measure(text, fontFn(s)) <= maxW) ?? null;
}

// Cut with an ellipsis until `width(text)` fits.
function ellipsize(text, width, maxW){
  const g = graphemes(text);
  while (g.length > 1 && width(g.join("").trimEnd() + "…") > maxW) g.pop();
  return g.join("").trimEnd() + "…";
}

// Break into two rows at the last space that fits (else mid-word).
function wrapTwo(text, width, maxW){
  const g = graphemes(text);
  let n = g.length;
  while (n > 1 && width(g.slice(0, n).join("")) > maxW) n--;
  let head = g.slice(0, n).join("");
  let at = n;
  if (n < g.length){
    const space = head.lastIndexOf(" ");
    if (space > 0){ head = head.slice(0, space); at = graphemes(head).length + 1; }
  }
  return [head.trimEnd(), g.slice(at).join("").trimStart()];
}

// The preview is a circle, so the caption must fit inside it: rows are placed
// below the mandala and each is kept within the circle's chord at its bottom edge.
// The text is as big as it can be; the mandala shrinks to make room.
const CIRCLE = 500, SIDE = 36;
const chord = bottom => 2 * Math.sqrt(Math.max(0, CIRCLE * CIRCLE - (bottom - 500) ** 2)) - 2 * SIDE;
const rowBottom = (y, size) => y + size * 0.6;

function captionTry([l1, l2], measure, M, allowWrap, minSize, k){
  const run = (text, fontFn, size, y) => ({ text, font: fontFn(size), size, x: 500, y });
  const fits = (text, fontFn, size, y) => measure(text, fontFn(size)) <= chord(rowBottom(y, size));
  let y = 68 + M;                       // top of the text zone (mandala has 40 above, 28 gap)
  const runs = [];
  let size = steps(84, minSize, k).find(s => fits(l1, font1, s, y + s * 0.6));
  if (size !== undefined){
    runs.push(run(l1, font1, size, y + size * 0.6));
    y += size * 1.2;
  } else if (allowWrap){
    for (const s of steps(60, 48, k)){
      const y1 = y + s * 0.6, y2 = y1 + s * 1.12;
      let [a, b] = wrapTwo(l1, t => measure(t, font1(s)), chord(rowBottom(y1, s)));
      if (!fits(b, font1, s, y2)){
        if (s > Math.round(48 * k) || M > 520) continue;   // cut with an ellipsis only after the mandala is as small as it goes
        b = ellipsize(b, t => measure(t, font1(s)), chord(rowBottom(y2, s)));
      }
      runs.push(run(a, font1, s, y1), run(b, font1, s, y2));
      y = y2 + s * 0.6 + s * 0.2;
      break;
    }
    if (!runs.length) return null;
  } else return null;
  if (l2){
    y += 14;
    const s2 = steps(52, 28, k).find(s => fits(l2, font2, s, y + s * 0.6));
    if (s2 !== undefined){
      runs.push(run(l2, font2, s2, y + s2 * 0.6));
    } else if (M > 520){
      return null;                        // shrink the mandala before wrapping or cutting the sign-off
    } else {
      const s = Math.round(30 * k), y1 = y + s * 0.6, y2 = y1 + s * 1.15;
      const width = t => measure(t, font2(s));
      let [a, b] = wrapTwo(l2, width, chord(rowBottom(y1, s)));
      if (width(b) > chord(rowBottom(y2, s))) b = ellipsize(b, width, chord(rowBottom(y2, s)));
      runs.push(run(a, font2, s, y1), run(b, font2, s, y2));
    }
  }
  const last = runs[runs.length - 1];
  if (rowBottom(last.y, last.size) > 975) return null;
  return { area: { cx: 500, cy: 40 + M / 2, size: M }, runs };
}

function captionLayout(lines, measure, k){
  // Prefer big text over a big mandala: 72 px and up, then 56 px and up, then two rows.
  for (const [wrap, min] of [[false, 72], [false, 56], [true, 56]])
    for (let M = 680; M >= 520; M -= 20){
      const L = captionTry(lines, measure, M, wrap, min, k);
      if (L) return L;
    }
  return captionTry([lines[0].slice(0, 20) + "…", lines[1]], measure, 520, true, 56, k);
}

// Glyphs laid along a circle. `top`: reads clockwise over the top with tops
// facing out. Otherwise along the bottom, counter-clockwise, tops facing in.
function arcRuns(text, fontFn, sizes, radius, maxDeg, top, measure){
  const maxW = radius * rad(maxDeg);
  const widthAt = (g, s) => g.reduce((sum, ch) => sum + measure(ch, fontFn(s)), 0);
  let g = graphemes(text);
  let size = sizes.find(s => widthAt(g, s) <= maxW);
  if (size === undefined){
    size = sizes[sizes.length - 1];
    g = g.slice(0, -1);
    while (g.length > 1 && widthAt([...g, "…"], size) > maxW) g.pop();
    g = [...g, "…"];
  }
  const total = widthAt(g, size);
  const font = fontFn(size);
  let at = 0;
  return g.map(glyph => {
    const w = measure(glyph, font);
    const off = (at + w / 2 - total / 2) / radius;
    at += w;
    const theta = top ? -Math.PI / 2 + off : Math.PI / 2 - off;
    return {
      glyph, font, size, theta,
      x: 500 + radius * Math.cos(theta),
      y: 500 + radius * Math.sin(theta),
      angle: top ? theta + Math.PI / 2 : theta - Math.PI / 2,
    };
  });
}

function edgeLayout([l1, l2], measure, k){
  const runs = arcRuns(l1, font1, steps(68, 32, k), 420, 160, true, measure);
  if (l2) runs.push(...arcRuns(l2, font2, steps(50, 28, k), 425, 140, false, measure));
  return { area: { cx: 500, cy: 500, size: 720 }, runs };
}

// The mandala's `area` plus the text runs, or { area: null, runs: [] } when
// there is no message. `measure(text, font)` returns a width in pixels;
// `textSize` is a percentage (70-130) of the default text sizes.
export function cardLayout(lines, layoutId, measure, textSize = 100){
  if (!lines[0]) return { area: null, runs: [] };
  const k = Math.min(130, Math.max(70, textSize)) / 100;
  return layoutId === "edge" ? edgeLayout(lines, measure, k) : captionLayout(lines, measure, k);
}
