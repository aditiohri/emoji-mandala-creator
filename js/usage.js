import { DEFAULT_PALETTE } from "./state.js";

const STORAGE_KEY = "mandala.emojiUsage";

function getUsageData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function setUsageData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Silently fail if storage unavailable
  }
}

export function recordUse(emoji) {
  try {
    const data = getUsageData();
    const current = data[emoji] || { count: 0, lastUsed: 0 };
    current.count = (current.count || 0) + 1;
    current.lastUsed = Date.now();
    data[emoji] = current;
    setUsageData(data);
  } catch (e) {
    // Gracefully degrade if anything goes wrong
  }
}

export function topEmoji(n) {
  try {
    const data = getUsageData();
    if (Object.keys(data).length === 0) {
      return null;
    }

    const entries = Object.entries(data).map(([emoji, info]) => ({
      emoji,
      count: info.count || 0,
      lastUsed: info.lastUsed || 0
    }));

    // Sort by count descending, then by lastUsed descending, then by stable order
    entries.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      if (b.lastUsed !== a.lastUsed) {
        return b.lastUsed - a.lastUsed;
      }
      // Stable order: by appearance in DEFAULT_PALETTE, then alphabetically
      const aDefault = DEFAULT_PALETTE.indexOf(a.emoji);
      const bDefault = DEFAULT_PALETTE.indexOf(b.emoji);
      if (aDefault >= 0 && bDefault >= 0) {
        return aDefault - bDefault;
      }
      if (aDefault >= 0) return -1;
      if (bDefault >= 0) return 1;
      return a.emoji.localeCompare(b.emoji);
    });

    return entries.slice(0, n).map(e => e.emoji);
  } catch (e) {
    return null;
  }
}
