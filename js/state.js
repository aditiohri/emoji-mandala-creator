export const DEFAULT_PALETTE = ["✨","🌸","🔥","🌊","🦋","🌙","🍃","💠"];

export const PICKER_EMOJI = [
  "✨","🌸","🌙","🔥","🌊","🦋","🍃","💠","⭐","🌻",
  "💎","🌀","🍄","🐚","🌈","🪷","🌺","🍁","☀️","❄️",
  "🕸️","🌼","🪐","🧿","🍂","🌷","🦚","🐉","🌹","🎇",
  "🍥","🌿","🐝","🌵","🍒","🌾","🎐","🦢","🧡","💫"
];

export const state = {
  palette: [...DEFAULT_PALETTE],
  shape: "rings",
  // Per-shape control values (plus `alternate`). Other shapes are filled
  // lazily from their control defaults on first visit (slice 3).
  shapeParams: {
    rings: { rings: 6, symmetry: 10, spacing: 100, alternate: true },
  },
  rotation: 0,
  emojiSize: 44,
  centerMode: "emoji",
  faceOutward: false,
  glow: true,
  zoom: 100,
  background: { type: "system" },
  // Greeting card (js/card.js). `note` is the share note; while noteMirrors it follows the message.
  card: { message: "", layout: "caption", note: "", noteMirrors: true }
};

export function seededPick(seedNum, arr){
  return arr[Math.abs(Math.floor(seedNum)) % arr.length];
}
