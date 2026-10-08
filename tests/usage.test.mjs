import assert from "assert";

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (key) => {
    if (mockStorage.throwOnGet) throw new Error("Storage error");
    return mockStorage[key] || null;
  },
  setItem: (key, value) => {
    if (mockStorage.throwOnSet) throw new Error("Storage error");
    mockStorage[key] = value;
  }
};

const DEFAULT_PALETTE = ["✨","🌸","🔥","🌊","🦋","🌙","🍃","💠"];

// Implementation of usage module inline for testing
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

function recordUse(emoji) {
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

function topEmoji(n) {
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

// Test suite
console.log("Running usage tests...\n");

// Test 1: Empty storage returns null
console.log("Test 1: Empty storage returns null");
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
mockStorage.throwOnGet = false;
mockStorage.throwOnSet = false;
const result1 = topEmoji(8);
assert.strictEqual(result1, null, "topEmoji should return null when storage is empty");
console.log("✓ Passed\n");

// Test 2: Recording use increments count
console.log("Test 2: Recording use increments count");
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
recordUse("✨");
recordUse("✨");
recordUse("🌸");
const data2 = JSON.parse(mockStorage[STORAGE_KEY]);
assert.strictEqual(data2["✨"].count, 2, "✨ should have count 2");
assert.strictEqual(data2["🌸"].count, 1, "🌸 should have count 1");
console.log("✓ Passed\n");

// Test 3: topEmoji returns most-used in order
console.log("Test 3: topEmoji returns most-used in order");
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
recordUse("🔥");
recordUse("🔥");
recordUse("🔥");
recordUse("🌊");
recordUse("🌊");
recordUse("🦋");
const result3 = topEmoji(3);
assert.deepStrictEqual(result3, ["🔥", "🌊", "🦋"], "topEmoji should return in count order");
console.log("✓ Passed\n");

// Test 4: topEmoji respects n parameter
console.log("Test 4: topEmoji respects n parameter");
// (using same data as test 3)
const result4 = topEmoji(2);
assert.deepStrictEqual(result4, ["🔥", "🌊"], "topEmoji(2) should return only 2 items");
const result4b = topEmoji(5);
assert.strictEqual(result4b.length, 3, "topEmoji(5) should return only 3 items when only 3 exist");
console.log("✓ Passed\n");

// Test 5: Tie-breaking by most recent use
console.log("Test 5: Tie-breaking by most recent use");
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
recordUse("✨");
const time1 = Date.now();
// Mock lastUsed values for testing tie-breaking
const data5 = getUsageData();
data5["✨"].lastUsed = time1;
data5["🌸"] = { count: 1, lastUsed: time1 + 1000 }; // Most recent
data5["🔥"] = { count: 1, lastUsed: time1 + 500 };  // In between
setUsageData(data5);
const result5 = topEmoji(3);
assert.deepStrictEqual(result5, ["🌸", "🔥", "✨"], "topEmoji should break ties by lastUsed (most recent first)");
console.log("✓ Passed\n");

// Test 6: Storage error on get returns null gracefully
console.log("Test 6: Storage error on get returns null gracefully");
mockStorage.throwOnGet = true;
const result6 = topEmoji(8);
assert.strictEqual(result6, null, "topEmoji should return null on storage error");
console.log("✓ Passed\n");

// Test 7: Storage error on set doesn't throw
console.log("Test 7: Storage error on set doesn't throw");
mockStorage.throwOnGet = false;
mockStorage.throwOnSet = true;
assert.doesNotThrow(() => {
  recordUse("✨");
}, "recordUse should not throw on storage error");
console.log("✓ Passed\n");

// Test 8: Stable order (DEFAULT_PALETTE) for ties
console.log("Test 8: Stable order (DEFAULT_PALETTE) for ties");
Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
mockStorage.throwOnSet = false;
recordUse("🌊");  // 4th in DEFAULT_PALETTE
recordUse("✨");  // 1st in DEFAULT_PALETTE
recordUse("🦋"); // 5th in DEFAULT_PALETTE
// All have count 1, so should be ordered by DEFAULT_PALETTE
const result8 = topEmoji(3);
assert.deepStrictEqual(result8, ["✨", "🌊", "🦋"], "topEmoji should use DEFAULT_PALETTE order for ties");
console.log("✓ Passed\n");

console.log("All tests passed!");
