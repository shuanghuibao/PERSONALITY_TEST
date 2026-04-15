import "./styles.css";
import { applyScores, initScores, pickResult } from "./quizEngine.js";
import { downloadBlob, renderSharePngBlob } from "./shareImage.js";

const app = document.querySelector("#app");

/** @type {string | null} */
let shareObjectUrl = null;

function revokeShareUrl() {
  if (shareObjectUrl) {
    URL.revokeObjectURL(shareObjectUrl);
    shareObjectUrl = null;
  }
}

/** @type {any} */
let categories = [];
/** @type {any} */
let activeQuiz = null;
/** @type {Record<string, number>} */
let scores = {};
let qIndex = 0;

function assetUrl(path) {
  const b = import.meta.env.BASE_URL || "/";
  const p = path.startsWith("/") ? path.slice(1) : path;
  return b.endsWith("/") ? `${b}${p}` : `${b}/${p}`;
}

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载失败: ${url}`);
  return res.json();
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderHome() {
  revokeShareUrl();
  activeQuiz = null;
  const cards = categories
    .map(
      (c) => `
      <button type="button" class="cat" data-id="${c.id}">
        <div class="cat-title">${escapeHtml(c.title)}</div>
        <div class="cat-sub">${escapeHtml(c.subtitle)}</div>
      </button>`
    )
    .join("");

  app.innerHTML = `
    <h1>赛博榨菜小测</h1>
    <p class="sub">先选一包「电子榨菜」口味：运动 / 恋爱 / 追星。题目偏玩梗，结果偏嘴替；认真你就输了半格，但完全不认真你也点不进来。</p>
    <section class="card">
      <h2 style="margin-top:0;font-size:1rem">今天想测啥</h2>
      <div class="category-grid">${cards}</div>
    </section>
  `;

  app.querySelectorAll("button.cat").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const cat = categories.find((x) => x.id === id);
      if (!cat) return;
      await startCategory(cat);
    });
  });
}

async function startCategory(cat) {
  app.innerHTML = `<p class="sub">加载中…</p>`;
  const quiz = await loadJson(assetUrl(cat.quizPath));
  activeQuiz = { cat, quiz };
  scores = initScores(quiz);
  qIndex = 0;
  renderIntro();
}

function renderIntro() {
  const { cat, quiz } = activeQuiz;
  app.innerHTML = `
    <h1>${escapeHtml(quiz.title)}</h1>
    <p class="sub">${escapeHtml(cat.subtitle)}</p>
    <section class="card">
      <p class="muted" style="margin-top:0">${escapeHtml(quiz.disclaimer || "")}</p>
      <p>${escapeHtml(quiz.intro || "")}</p>
      <p class="muted">共 ${quiz.questions.length} 题，预计 3–6 分钟。</p>
      <div class="btn-row">
        <button type="button" class="primary" id="btn-begin">开始答题</button>
        <button type="button" class="ghost" id="btn-back">返回主题</button>
      </div>
    </section>
  `;
  $("#btn-begin", app).addEventListener("click", () => renderQuestion());
  $("#btn-back", app).addEventListener("click", () => renderHome());
}

function $(sel, root = document) {
  const n = root.querySelector(sel);
  if (!n) throw new Error(`missing ${sel}`);
  return n;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderQuestion() {
  const { quiz } = activeQuiz;
  const q = quiz.questions[qIndex];
  const pct = (qIndex / quiz.questions.length) * 100;
  const opts = q.choices
    .map(
      (c, i) =>
        `<button type="button" class="option" data-i="${i}">${escapeHtml(c.label)}</button>`
    )
    .join("");

  app.innerHTML = `
    <h1>${escapeHtml(quiz.title)}</h1>
    <section class="card">
      <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="q-text">第 ${qIndex + 1} / ${quiz.questions.length} 题：${escapeHtml(q.text)}</p>
      <div id="options">${opts}</div>
      <div class="btn-row">
        <button type="button" class="ghost" id="btn-abort">退出本次</button>
      </div>
    </section>
  `;

  $("#btn-abort", app).addEventListener("click", () => renderHome());

  $("#options", app).querySelectorAll("button.option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-i"));
      const choice = q.choices[i];
      applyScores(scores, choice.scores || {});
      qIndex += 1;
      if (qIndex < quiz.questions.length) renderQuestion();
      else renderResult();
    });
  });
}

function renderResult() {
  revokeShareUrl();
  const { cat, quiz } = activeQuiz;
  const { axisKey, result } = pickResult(quiz, scores);
  const bullets = (result.bullets || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("");
  const paras = String(result.body || "")
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br/>")}</p>`)
    .join("");
  const lineEn = escapeHtml(result.shareCodeLineEn || "");

  const node = el(`
    <div>
      <h1>出分了（赛博版）</h1>
      <p class="sub">${escapeHtml(quiz.title)}</p>
      <section class="card">
        <div class="result-code">${escapeHtml(result.shareCode)}</div>
        <p class="share-line-en" aria-label="英文释义">${lineEn}</p>
        <div class="axis-pill">三轴暗号：${escapeHtml(axisKey)}（懂的人自然懂）</div>
        <h2 class="result-title">${escapeHtml(result.title)}</h2>
        ${result.tagline ? `<p class="muted">${escapeHtml(result.tagline)}</p>` : ""}
        <div class="share-preview" id="share-preview">
          <p class="muted" id="share-loading">分享图生成中…</p>
          <img id="share-img" class="share-img hidden" alt="你的结果分享图" />
        </div>
        <div class="result-body">${paras}</div>
        ${
          bullets
            ? `<ul class="result-bullets">${bullets}</ul>`
            : ""
        }
        <p class="cite">${escapeHtml(result.cite || "")}</p>
        <div class="btn-row">
          <button type="button" class="primary" id="btn-share">下载这张图为 PNG</button>
          <button type="button" class="ghost" id="btn-again">同主题再测</button>
          <button type="button" class="ghost" id="btn-home">换主题</button>
        </div>
      </section>
    </div>
  `);
  app.innerHTML = "";
  app.appendChild(node);

  $("#btn-home", app).addEventListener("click", () => renderHome());
  $("#btn-again", app).addEventListener("click", () => {
    revokeShareUrl();
    scores = initScores(quiz);
    qIndex = 0;
    renderIntro();
  });

  const imgEl = $("#share-img", app);
  const loadEl = $("#share-loading", app);

  (async () => {
    try {
      const blob = await renderSharePngBlob({
        shareCode: result.shareCode,
        shareCodeLineEn: result.shareCodeLineEn || "",
        title: result.title,
        tagline: result.tagline || quiz.title,
        categoryTitle: cat.title,
        gradient: cat.theme.gradient,
        accent: cat.theme.accent,
      });
      shareObjectUrl = URL.createObjectURL(blob);
      imgEl.src = shareObjectUrl;
      imgEl.classList.remove("hidden");
      loadEl.classList.add("hidden");
    } catch (e) {
      console.error(e);
      loadEl.textContent = "分享图生成失败：换个浏览器试试，或刷新页面。";
    }
  })();

  $("#btn-share", app).addEventListener("click", async () => {
    const btn = $("#btn-share", app);
    btn.setAttribute("disabled", "true");
    try {
      const blob = await renderSharePngBlob({
        shareCode: result.shareCode,
        shareCodeLineEn: result.shareCodeLineEn || "",
        title: result.title,
        tagline: result.tagline || quiz.title,
        categoryTitle: cat.title,
        gradient: cat.theme.gradient,
        accent: cat.theme.accent,
      });
      downloadBlob(blob, `quiz-${cat.id}-${result.shareCode}.png`);
    } catch (e) {
      console.error(e);
      alert("下载失败：请换浏览器重试。");
    } finally {
      btn.removeAttribute("disabled");
    }
  });
}

async function boot() {
  try {
    categories = await loadJson(assetUrl("data/categories.json"));
    renderHome();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p class="sub">初始化失败：${escapeHtml(String(e))}</p>`;
  }
}

boot();
