/**
 * 生成类似 MBTI 类型卡的方形分享图（Canvas）。
 * shareCodeLineEn：把四个字母分别对应成英文单词/短语，写在图上，避免「无意义缩写」。
 */

/** @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} maxWidth */
function wrapByChar(ctx, text, maxWidth) {
  /** @type {string[]} */
  const lines = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch.trimStart() ? ch : "";
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text supports \\n
 * @param {number} x center x
 * @param {number} y baseline first line
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @param {string} font
 */
function fillTextMultilineCenter(ctx, text, x, y, maxWidth, lineHeight, font) {
  ctx.font = font;
  /** @type {string[]} */
  const all = [];
  for (const para of String(text).split("\n")) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    all.push(...wrapByChar(ctx, trimmed, maxWidth));
  }
  if (!all.length) return 0;
  all.forEach((ln, idx) => {
    ctx.fillText(ln, x, y + idx * lineHeight);
  });
  return all.length * lineHeight;
}

/**
 * @param {{
 *   shareCode: string;
 *   shareCodeLineEn: string;
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

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = '600 34px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(opts.categoryTitle, size / 2, 108);

  const code = (opts.shareCode || "TYPE").toUpperCase().slice(0, 4).padEnd(4, "·");
  ctx.font = '800 168px "SF Pro Display","Helvetica Neue",system-ui,sans-serif';
  ctx.fillStyle = opts.accent;
  ctx.fillText(code, size / 2, 300);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const lineEn = opts.shareCodeLineEn || "";
  ctx.font = '500 30px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  const used = fillTextMultilineCenter(ctx, lineEn, size / 2, 350, size - 140, 40, ctx.font);
  let yNext = 350 + used + 28;

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = '600 46px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  const title = truncateLine(ctx, opts.title, size - 140);
  ctx.fillText(title, size / 2, yNext);
  yNext += 72;

  if (opts.tagline) {
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = '400 30px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
    const tg = truncateLine(ctx, opts.tagline, size - 180);
    ctx.fillText(tg, size / 2, yNext);
    yNext += 56;
  }

  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.font = '400 24px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  ctx.fillText("赛博榨菜小测 · 图一乐别上纲上线", size / 2, size - 96);

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
function truncateLine(ctx, text, maxWidth) {
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
