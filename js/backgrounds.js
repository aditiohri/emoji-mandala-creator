// Calculate relative luminance of a color (for determining text color)
export function getLuminance(r, g, b, a = 1) {
  // Normalize to 0-1
  r /= 255; g /= 255; b /= 255;
  // Adjust for gamma
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) * a;
}

// Parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// Get luminance for a solid color
function getLuminanceForColor(color) {
  const rgb = hexToRgb(color);
  return getLuminance(rgb.r, rgb.g, rgb.b);
}

// Calculate average luminance for a gradient
function getLuminanceForGradient(color1, color2) {
  const lum1 = getLuminanceForColor(color1);
  const lum2 = getLuminanceForColor(color2);
  return (lum1 + lum2) / 2;
}

const imageLumCache = new WeakMap();

// Get luminance from image (sample the center or downscale)
function getLuminanceForImage(img) {
  if (!img) return 0.5;
  if (imageLumCache.has(img)) return imageLumCache.get(img);
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 64;
  tempCanvas.height = 64;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(img, 0, 0, 64, 64);

  const imageData = tempCtx.getImageData(0, 0, 64, 64);
  const data = imageData.data;
  let totalLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLum += getLuminance(data[i], data[i+1], data[i+2], data[i+3]/255);
  }
  const lum = totalLum / (data.length / 4);
  imageLumCache.set(img, lum);
  return lum;
}

// Get luminance for a background object ({ type, ... })
export function getBackgroundLuminance(bg) {
  if (!bg) return 0.5;

  if (bg.type === "system") {
    // For system, check system theme
    const isDark = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    const rootTheme = document.documentElement.getAttribute("data-theme");
    const dark = rootTheme === "dark" || (rootTheme !== "light" && isDark);
    return dark ? 0.15 : 0.92; // Dark is lower, light is higher
  }

  if (bg.type === "solid" && bg.color) {
    return getLuminanceForColor(bg.color);
  }

  if (bg.type === "gradient" && bg.color1 && bg.color2) {
    return getLuminanceForGradient(bg.color1, bg.color2);
  }

  if (bg.type === "image" && bg.imageElement) {
    return getLuminanceForImage(bg.imageElement);
  }

  return 0.5;
}

// Draw the canvas background. opts = { background, glow, emojiSize }
export function drawBackground(ctx, W, H, opts) {
  const bg = opts.background;
  const cx = W/2, cy = H/2;
  const maxR = W/2 - opts.emojiSize*0.9;

  // Determine if we should use dark colors
  const lum = getBackgroundLuminance(bg);
  const dark = lum < 0.5; // If average luminance is low, we're dark

  // Draw background
  if (!bg || bg.type === "system") {
    const isDark = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    const rootTheme = document.documentElement.getAttribute("data-theme");
    const systemDark = rootTheme === "dark" || (rootTheme !== "light" && isDark);
    const bgColor = systemDark ? "#1a1526" : "#f7f0e2";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.type === "solid" && bg.color) {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.type === "gradient" && bg.color1 && bg.color2) {
    const angle = (bg.angle || 0) * Math.PI / 180;
    const dist = Math.sqrt(W*W + H*H);
    const x1 = cx - dist/2 * Math.cos(angle);
    const y1 = cy - dist/2 * Math.sin(angle);
    const x2 = cx + dist/2 * Math.cos(angle);
    const y2 = cy + dist/2 * Math.sin(angle);

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, bg.color1);
    grad.addColorStop(1, bg.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.type === "image" && bg.imageElement) {
    const img = bg.imageElement;
    // Cover-fit the image to the square
    const scale = Math.max(W / img.width, H / img.height);
    const x = (W - img.width * scale) / 2;
    const y = (H - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }

  // Soft glow on top
  if (opts.glow){
    const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,maxR*1.05);
    if (dark){
      grad.addColorStop(0, "rgba(139,107,255,0.30)");
      grad.addColorStop(1, "rgba(139,107,255,0)");
    } else {
      grad.addColorStop(0, "rgba(255,107,74,0.22)");
      grad.addColorStop(1, "rgba(255,107,74,0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx,cy,maxR*1.05,0,Math.PI*2);
    ctx.fill();
  }

  return dark;
}

// Does a swatch entry describe the same background as `current` (state.background)?
function sameBackground(entry, current) {
  if (!entry || !current || entry.type !== current.type) return false;
  switch (entry.type) {
    case "system": return true;
    case "solid": return entry.color === current.color;
    case "gradient":
      return entry.color1 === current.color1 && entry.color2 === current.color2 &&
        (entry.angle || 0) === (current.angle || 0);
    case "image": return !!current.imageElement && current.imageElement.src === entry.dataUrl;
    default: return false;
  }
}

// Index of the swatch in `all` that is the current background, or -1. Matches by
// value so it survives removing other swatches; `current.idx` breaks ties when a
// custom swatch duplicates a preset.
export function activeBackgroundIndex(all, current) {
  if (!current) return -1;
  if (typeof current.idx === "number" && sameBackground(all[current.idx], current)) return current.idx;
  return all.findIndex(entry => sameBackground(entry, current));
}
