/**
 * 生成类似 MBTI 类型卡的方形分享图（Canvas）。
 * @param {{
 *   shareCode: string;
 *   title: string;
 *   tagline?: string;
 *   categoryTitle: string;
 *   gradient: [string, string];
 *   accent: string;
 * }} opts
 */
export async function renderSharePngBlob(opts) {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, opts.gradient[0]);
  g.addColorStop(1, opts.gradient[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = opts.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(32, 32, size - 64, size - 64);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = '600 36px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(opts.categoryTitle, size / 2, 120);

  const code = (opts.shareCode || "TYPE").toUpperCase().slice(0, 4).padEnd(4, "·");
  ctx.font = '800 220px "SF Pro Display","Helvetica Neue",system-ui,sans-serif';
  ctx.fillStyle = opts.accent;
  ctx.fillText(code, size / 2, size / 2 + 40);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = '600 52px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  const title = truncate(ctx, opts.title, size - 160);
  ctx.fillText(title, size / 2, size / 2 + 150);

  if (opts.tagline) {
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = '400 34px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    const tg = truncate(ctx, opts.tagline, size - 200);
    ctx.fillText(tg, size / 2, size / 2 + 220);
  }

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = '400 26px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  ctx.fillText("分类偏好小测 · 结果仅供自我探索", size / 2, size - 120);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("toBlob failed"));
        else resolve(blob);
      },
      "image/png",
      0.92
    );
  });
}

/** @param {CanvasRenderingContext2D} ctx */
function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}…`;
}

/** @param {Blob} blob @param {string} filename */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
