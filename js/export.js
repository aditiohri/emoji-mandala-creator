import { canvas } from "./draw.js";
import { state } from "./state.js";
import { cardLines, cardLabel, cardFilename, shareFields } from "./card.js";

// Named from line 1 of the card message; the dated name when there is none.
export function mandalaFilename(){
  return cardFilename(cardLines(state.card.message)[0]);
}

// Title and (optional) note for navigator.share.
function shareData(file){
  const { title, text } = shareFields(state.card.message, state.card.note, state.card.noteMirrors);
  return text ? { files: [file], title, text } : { files: [file], title };
}

// Can this browser share image files? (Unhides the Share button and the share note.)
export function canNativeShare(){
  return !!(navigator.share && navigator.canShare &&
    navigator.canShare({ files: [new File([], "test.png", { type: "image/png" })] }));
}

export function renderBlob(){
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

// Say what happened to the Save/Share button, which only changes its own text.
function announce(message){
  const el = document.getElementById("actionStatus");
  el.textContent = "";
  setTimeout(() => { el.textContent = message; }, 50);
}

export function showExportImage(dataUrl){
  const exportPanel = document.getElementById("exportPanel");
  const exportImg = document.getElementById("exportImg");
  exportImg.src = dataUrl;
  exportImg.alt = cardLabel(cardLines(state.card.message)) + "Rendered emoji mandala";
  exportPanel.hidden = false;
  announce("Your mandala is ready below. Press and hold the image to save or share it.");
  exportPanel.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
}

export function setupExportPanel(){
  const exportPanel = document.getElementById("exportPanel");
  const closeExportBtn = document.getElementById("closeExport");
  closeExportBtn.addEventListener("click", () => {
    exportPanel.hidden = true;
    const exportImg = document.getElementById("exportImg");
    exportImg.removeAttribute("src");
  });
}

export function setupSaveButton(){
  const saveBtn = document.getElementById("save");
  const isTouch = matchMedia("(pointer: coarse)").matches;
  saveBtn.textContent = isTouch ? "⬇ Save / share image" : "⬇ Save image";

  saveBtn.addEventListener("click", async () => {
    const btn = saveBtn;
    const original = btn.textContent;
    const reset = () => setTimeout(() => { btn.textContent = original; }, 1800);
    btn.textContent = "Rendering…";
    announce("Rendering your mandala");

    const filename = mandalaFilename();
    const dataUrl = canvas.toDataURL("image/png");

    let downloads = null;
    try{
      downloads = (window.claude && window.claude.use) ? await window.claude.use("downloads") : null;
    } catch(e){ downloads = null; }

    const blob = await renderBlob();

    // 1. Signed-in Claude viewers: native save dialog.
    if (downloads && blob){
      try{
        await downloads.save({ filename, data: blob });
        btn.textContent = "Saved ✓"; announce("Mandala saved"); reset(); return;
      } catch(err){ /* fall through */ }
    }
    // 2. Touch devices with Web Share API: OS share sheet (Save to Photos, etc).
    if (isTouch && blob && navigator.share && navigator.canShare){
      try{
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })){
          await navigator.share(shareData(file));
          btn.textContent = "Shared ✓"; announce("Mandala shared"); reset(); return;
        }
      } catch(err){
        if (err && err.name === "AbortError"){ btn.textContent = original; announce("Sharing cancelled"); return; }
      }
    }
    // 3. Desktop: direct download straight to the Downloads folder, no prompts.
    if (!isTouch && blob){
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      btn.textContent = "Saved ✓"; announce("Mandala saved to your downloads as " + filename); reset(); return;
    }
    // 4. Fallback: inline image to long-press / right-click.
    showExportImage(dataUrl);
    btn.textContent = original;
  });
}

export function setupShareButton(){
  const shareBtn = document.getElementById("share");
  if (canNativeShare()){
    shareBtn.hidden = false;
    shareBtn.addEventListener("click", async () => {
      const original = shareBtn.textContent;
      shareBtn.textContent = "Rendering…";
      announce("Rendering your mandala");
      const blob = await renderBlob();
      try{
        const file = new File([blob], mandalaFilename(), { type: "image/png" });
        await navigator.share(shareData(file));
        announce("Mandala shared");
      } catch(err){ /* cancelled or unsupported at call time */ }
      shareBtn.textContent = original;
    });
  }
}
