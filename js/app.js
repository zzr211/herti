let QUESTIONS = [];
let PERSONAS = {};

let currentQ = 0;
let answers = new Array(20).fill(null);
let userVec = [0, 0, 0, 0, 0];
let latestResult = null;

const SIGMA_INV = [
  [ 1.5901, -0.9630, -0.9542, -1.0474,  0.2719],
  [-0.9630,  1.9043,  1.4849,  0.6040, -0.4563],
  [-0.9542,  1.4849,  1.8050,  0.7022, -0.6433],
  [-1.0474,  0.6040,  0.7022,  1.3543,  0.0767],
  [ 0.2719, -0.4563, -0.6433,  0.0767,  0.8414],
];

function t(path, fallback = "") {
  return window.HERTI_I18N.t(path, fallback);
}

function buildDataFromLocale() {
  const locale = window.HERTI_I18N.getCurrentMessages();
  QUESTIONS = locale.questions.map((q, idx) => ({
    section: q.section,
    q: q.q,
    options: q.options.map((text, optIdx) => ({
      t: text,
      d: QUESTION_DELTAS[idx][optIdx],
    })),
  }));

  PERSONAS = {};
  PERSONA_ORDER.forEach((code) => {
    PERSONAS[code] = {
      vec: PERSONA_VECS[code],
      ...locale.personas[code],
    };
  });
}

function getPageCreditsHtml() {
  const maint = t("ui.credits.maint");
  return `
    <div class="page-credits">
      <p class="page-credits-maint">${maint} · <a href="https://qqwsh.top" target="_blank" rel="noopener noreferrer" title="主站">qqwsh.top</a> · <a href="https://tihub.qqwsh.top" target="_blank" rel="noopener noreferrer" title="导航站">tihub.qqwsh.top</a> · <a href="https://x.com/ying_zhiwei" target="_blank" rel="noopener noreferrer" title="X / Twitter">X · 嬴知微 @ying_zhiwei</a></p>
    </div>
  `;
}

function renderLanguageSwitcher() {
  const mount = document.getElementById("languageSwitcher");
  if (!mount) return;
  const list = t("ui.languages", []);
  mount.innerHTML = list.map((item) => {
    const active = item.code === window.HERTI_I18N.getCurrentLocale();
    return `<button class="lang-btn${active ? " active" : ""}" data-lang="${item.code}" type="button">${item.label}</button>`;
  }).join('<span class="lang-dot">·</span>');
}

function applyLocalizedStaticText() {
  document.title = t("ui.title", "HERTI");
  document.getElementById("coverSub").textContent = t("ui.cover.sub", "");
  document.getElementById("coverCnTitle").textContent = t("ui.cover.cnTitle", "");
  document.getElementById("coverTagline").innerHTML = t("ui.cover.tagline", []).join("<br>");
  document.getElementById("coverMeta").textContent = t("ui.cover.meta", "");
  document.getElementById("startBtn").textContent = t("ui.cover.start", "");
  document.getElementById("startHint").textContent = t("ui.cover.hint", "");
  document.getElementById("backBtn").textContent = t("ui.quiz.back", "");
  document.getElementById("quizFoot").textContent = t("ui.quiz.footer", "HERTI");
  document.getElementById("loadingText").innerHTML = t("ui.loading.text", []).join("<br>");
  document.getElementById("coverCreditsMount").innerHTML = getPageCreditsHtml();
  renderLanguageSwitcher();
}

function startQuiz() {
  currentQ = 0;
  answers = new Array(QUESTIONS.length).fill(null);
  userVec = [0, 0, 0, 0, 0];
  latestResult = null;
  document.getElementById("result").classList.remove("active");
  document.getElementById("cover").style.display = "none";
  document.getElementById("loading").classList.remove("active");
  document.getElementById("quiz").classList.add("active");
  renderQuestion();
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  document.getElementById("quizSection").textContent = q.section;
  document.getElementById("quizProgress").textContent = `${String(currentQ + 1).padStart(2, "0")} / ${QUESTIONS.length}`;
  document.getElementById("progressFill").style.width = `${((currentQ + 1) / QUESTIONS.length) * 100}%`;
  document.getElementById("questionNum").textContent = `${t("ui.quiz.questionPrefix", "Question ")}${String(currentQ + 1).padStart(2, "0")}`;
  document.getElementById("questionText").textContent = q.q;

  const selectedIdx = answers[currentQ];
  document.getElementById("options").innerHTML = q.options.map((opt, i) => {
    const selectedClass = selectedIdx === i ? " selected" : "";
    return `<div class="option${selectedClass}" onclick="pickOption(${i})"><span class="option-letter">${String.fromCharCode(65 + i)}.</span><span class="option-text">${opt.t}</span></div>`;
  }).join("");

  document.getElementById("backBtn").style.visibility = currentQ === 0 ? "hidden" : "visible";
}

function pickOption(idx) {
  answers[currentQ] = idx;
  currentQ += 1;
  if (currentQ >= QUESTIONS.length) {
    finishQuiz();
    return;
  }
  renderQuestion();
}

function goBack() {
  if (currentQ === 0) return;
  currentQ -= 1;
  renderQuestion();
}

function recalcUserVector() {
  userVec = [0, 0, 0, 0, 0];
  for (let qIdx = 0; qIdx < QUESTIONS.length; qIdx += 1) {
    const aIdx = answers[qIdx];
    if (aIdx === null) continue;
    const delta = QUESTIONS[qIdx].options[aIdx].d;
    for (let i = 0; i < 5; i += 1) userVec[i] += delta[i];
  }
}

function finishQuiz() {
  recalcUserVector();
  document.getElementById("quiz").classList.remove("active");
  document.getElementById("loading").classList.add("active");
  window.scrollTo(0, 0);

  setTimeout(() => {
    latestResult = matchPersona();
    document.getElementById("loading").classList.remove("active");
    renderResult(latestResult);
    document.getElementById("result").classList.add("active");
  }, 2400);
}

function normalize(vec) {
  const maxAbs = Math.max(...vec.map(Math.abs));
  if (maxAbs === 0) return vec.slice();
  return vec.map((v) => (v * 2) / maxAbs);
}

function mahalanobis(a, b) {
  const diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3], a[4] - b[4]];
  let s = 0;
  for (let i = 0; i < 5; i += 1) {
    for (let j = 0; j < 5; j += 1) {
      s += diff[i] * SIGMA_INV[i][j] * diff[j];
    }
  }
  return Math.sqrt(Math.max(s, 0));
}

function matchPersona() {
  const userNorm = normalize(userVec);
  const distances = PERSONA_ORDER.map((code) => ({
    code,
    dist: mahalanobis(userNorm, PERSONAS[code].vec),
  })).sort((a, b) => a.dist - b.dist);
  return {
    primary: distances[0].code,
    mirror: distances[1].code,
    opposite: distances[distances.length - 1].code,
  };
}

function renderResult(r) {
  const p = PERSONAS[r.primary];
  const mirror = PERSONAS[r.mirror];
  const opposite = PERSONAS[r.opposite];
  const idx = PERSONA_ORDER.indexOf(r.primary) + 1;

  const html = `
    <div class="brand-bar">
      <div class="logo">HERTI</div>
      <div class="meta">No.${String(idx).padStart(3, "0")} / ${PERSONA_ORDER.length}</div>
    </div>
    <div class="hero">
      <div class="hero-label">${t("ui.result.heroLabel")}</div>
      <div class="hero-code">${r.primary}</div>
      <div class="hero-meaning">— ${p.source}</div>
      <div class="hero-cn-name">${p.cn}</div>
      <div class="epigraph">${p.epigraph}</div>
    </div>
    <div class="section">
      <div class="section-label">${t("ui.result.sectionLabel")}</div>
      ${p.persona.map((line) => `<p class="persona-text">${line}</p>`).join("")}
      <div class="tags">${p.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    </div>
    <div class="ornament-mid">· · ·</div>
    <div class="soul-card">
      <div class="soul-label">${t("ui.result.soulLabel")}</div>
      <div class="soul-name">${p.enName}</div>
      <div class="soul-name-cn">${p.cnName}</div>
      ${p.soul.map((line) => `<p class="soul-text">${line}</p>`).join("")}
    </div>
    <div class="relations">
      <div class="relation-card">
        <div class="relation-label">${t("ui.result.mirrorLabel")}</div>
        <div class="relation-code">${r.mirror}</div>
        <div class="relation-name">${mirror.cn} · ${mirror.cnName}</div>
      </div>
      <div class="relation-card">
        <div class="relation-label">${t("ui.result.oppositeLabel")}</div>
        <div class="relation-code">${r.opposite}</div>
        <div class="relation-name">${opposite.cn} · ${opposite.cnName}</div>
      </div>
    </div>
    <div class="footer">
      <div class="ornament-mid">· · ·</div>
      <p class="footer-quote">${t("ui.result.footerQuote", []).join("<br>")}</p>
      <p class="share-hint">${t("ui.result.shareHint", []).join("<br>")}</p>
      <button class="restart-btn" onclick="restart()">${t("ui.result.restart")}</button>
      <p class="nominate">${t("ui.result.nominate", []).join("<br>")}<br><em>${t("ui.result.nominateEm", []).join("<br>")}</em></p>
      <div class="brand-foot">${t("ui.result.brandFoot")}</div>
      ${getPageCreditsHtml()}
    </div>
  `;

  document.getElementById("result").innerHTML = html;
  window.scrollTo(0, 0);
}

function restart() {
  document.getElementById("result").classList.remove("active");
  document.getElementById("loading").classList.remove("active");
  document.getElementById("quiz").classList.remove("active");
  document.getElementById("cover").style.display = "flex";
  window.scrollTo(0, 0);
}

async function switchLanguage(localeCode) {
  await window.HERTI_I18N.setLocale(localeCode);
  buildDataFromLocale();
  applyLocalizedStaticText();

  if (document.getElementById("result").classList.contains("active") && latestResult) {
    renderResult(latestResult);
  } else if (document.getElementById("quiz").classList.contains("active")) {
    renderQuestion();
  }
}

document.addEventListener("click", (evt) => {
  const btn = evt.target.closest(".lang-btn");
  if (!btn) return;
  switchLanguage(btn.dataset.lang);
});

document.addEventListener("DOMContentLoaded", async () => {
  const locale = window.HERTI_I18N.detectLocale();
  await window.HERTI_I18N.setLocale(locale);
  buildDataFromLocale();
  applyLocalizedStaticText();
});
