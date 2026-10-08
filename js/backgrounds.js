export function drawBackground(ctx, W, H, state, dark){
  const cx = W/2, cy = H/2;
  const maxR = W/2 - state.emojiSize*0.9;

  if (state.backdrop === "soft"){
    const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,maxR*1.05);
    if (dark){
      grad.addColorStop(0, "rgba(139,107,255,0.16)");
      grad.addColorStop(1, "rgba(139,107,255,0)");
    } else {
      grad.addColorStop(0, "rgba(255,107,74,0.10)");
      grad.addColorStop(1, "rgba(255,107,74,0)");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx,cy,maxR*1.05,0,Math.PI*2);
    ctx.fill();
  } else if (state.backdrop === "rings"){
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for (let i=1; i<=state.rings; i++){
      const r = (i/state.rings) * maxR;
      ctx.beginPath();
      ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.stroke();
    }
  }
}
