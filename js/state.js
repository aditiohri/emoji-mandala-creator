export const DEFAULT_PALETTE = ["✨","🌸","🔥","🌊","🦋","🌙","🍃","💠"];

export const PICKER_EMOJI = [
  "✨","🌸","🌙","🔥","🌊","🦋","🍃","💠","⭐","🌻",
  "💎","🌀","🍄","🐚","🌈","🪷","🌺","🍁","☀️","❄️",
  "🕸️","🌼","🪐","🧿","🍂","🌷","🦚","🐉","🌹","🎇",
  "🍥","🌿","🐝","🌵","🍒","🌾","🎐","🦢","🧡","💫"
];

export const state = {
  palette: [...DEFAULT_PALETTE],
  rings: 6,
  symmetry: 10,
  rotation: 0,
  emojiSize: 44,
  spacing: 100,
  centerMode: "emoji",
  alternate: true,
  faceOutward: false,
  backdrop: "soft",
  zoom: 100
};

export function seededPick(seedNum, arr){
  return arr[Math.abs(Math.floor(seedNum)) % arr.length];
}
