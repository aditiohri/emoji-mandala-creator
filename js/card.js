// Greeting card: message text, layout maths, filename and share fields.
// Pure (no DOM) so it can be unit-tested in Node; draw.js does the drawing.

export const MAX_LINE = 60;
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

// --- layout (units are a 1000 x 1000 canvas) -------------------------------

const rad = deg => deg * Math.PI / 180;

function steps(from, to){
  const out = [];
  for (let s = from; s >= to; s -= 2) out.push(s);
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

function captionLayout([l1, l2], measure){
  const run = (text, fontFn, size, y) => ({ text, font: fontFn(size), size, x: 500, y });
  const w1 = fitSize(l1, font1, steps(64, 40), 900, measure);
  let area, runs, bottom;
  if (w1 !== null){
    area = { cx: 500, cy: 400, size: 760 };
    runs = [run(l1, font1, w1, 865)];
    bottom = 940;
  } else {
    const width = t => measure(t, font1(40));
    let [a, b] = wrapTwo(l1, width, 900);
    if (width(b) > 900) b = ellipsize(b, width, 900);
    area = { cx: 500, cy: 370, size: 700 };
    runs = [run(a, font1, 40, 830), run(b, font1, 40, 890)];
    bottom = 960;
  }
  if (l2){
    const w2 = fitSize(l2, font2, steps(40, 28), 800, measure);
    if (w2 !== null) runs.push(run(l2, font2, w2, bottom));
    else runs.push(run(ellipsize(l2, t => measure(t, font2(28)), 800), font2, 28, bottom));
  }
  return { area, runs };
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

function edgeLayout([l1, l2], measure){
  const runs = arcRuns(l1, font1, steps(58, 32), 420, 160, true, measure);
  if (l2) runs.push(...arcRuns(l2, font2, steps(40, 28), 425, 140, false, measure));
  return { area: { cx: 500, cy: 500, size: 720 }, runs };
}

// The mandala's `area` plus the text runs, or { area: null, runs: [] } when
// there is no message. `measure(text, font)` returns a width in pixels.
export function cardLayout(lines, layoutId, measure){
  if (!lines[0]) return { area: null, runs: [] };
  return layoutId === "edge" ? edgeLayout(lines, measure) : captionLayout(lines, measure);
}
