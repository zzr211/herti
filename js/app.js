let currentQ = 0;
let answers = new Array(20).fill(null);
let userVec = [0, 0, 0, 0, 0];

/** 封面底部与结果页底部共用：答题与加载中不出现，以免打断沉浸感 */
function getPageCreditsHtml() {
  const xhs = 'https://www.xiaohongshu.com/user/profile/607e40270000000001001849';
  return `
    <div class="page-credits">
      <p>题目与呈现源自 <a href="https://herti.us/" target="_blank" rel="noopener noreferrer">herti.us</a>，版权归原作者与原作站点；本站为个人学习归档之副本。</p>
      <p class="page-credits-maint">维护 · <a href="https://space.bilibili.com/435242714" target="_blank" rel="noopener noreferrer" title="哔哩哔哩">哔哩哔哩 · 清心寡欲哆啦道人</a> · <a href="${xhs}" target="_blank" rel="noopener noreferrer" title="小红书">小红书 · Dreammaker</a> · 公众号「千秋万事」 · <a href="https://sbtihub.pages.dev/" target="_blank" rel="noopener noreferrer" title="书签与导航">sbtihub.pages.dev</a></p>
    </div>
  `;
}

function startQuiz() {
  currentQ = 0;
  answers = new Array(20).fill(null);
  userVec = [0, 0, 0, 0, 0];
  document.getElementById('cover').style.display = 'none';
  document.getElementById('quiz').classList.add('active');
  renderQuestion();
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const q = QUESTIONS[currentQ];
  document.getElementById('quizSection').textContent = q.section;
  document.getElementById('quizProgress').textContent =
    String(currentQ + 1).padStart(2, '0') + ' / 20';
  document.getElementById('progressFill').style.width =
    ((currentQ + 1) / 20 * 100) + '%';
  document.getElementById('questionNum').textContent =
    'Question ' + String(currentQ + 1).padStart(2, '0');
  document.getElementById('questionText').textContent = q.q;

  const selectedIdx = answers[currentQ];
  const optsHtml = q.options.map((opt, i) => {
    const selectedClass = (selectedIdx === i) ? ' selected' : '';
    return `<div class="option${selectedClass}" onclick="pickOption(${i})">
      <span class="option-letter">${String.fromCharCode(65+i)}.</span>
      <span class="option-text">${opt.t}</span>
    </div>`;
  }).join('');
  document.getElementById('options').innerHTML = optsHtml;

  const backBtn = document.getElementById('backBtn');
  backBtn.style.visibility = currentQ === 0 ? 'hidden' : 'visible';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function pickOption(idx) {
  answers[currentQ] = idx;

  currentQ++;
  if (currentQ >= QUESTIONS.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
}

function goBack() {
  if (currentQ > 0) {
    currentQ--;
    renderQuestion();
  }
}

function finishQuiz() {
  userVec = [0, 0, 0, 0, 0];
  for (let qIdx = 0; qIdx < QUESTIONS.length; qIdx++) {
    const aIdx = answers[qIdx];
    if (aIdx !== null) {
      const delta = QUESTIONS[qIdx].options[aIdx].d;
      for (let i = 0; i < 5; i++) userVec[i] += delta[i];
    }
  }

  document.getElementById('quiz').classList.remove('active');
  document.getElementById('loading').classList.add('active');
  window.scrollTo(0, 0);

  setTimeout(() => {
    const result = matchPersona();
    document.getElementById('loading').classList.remove('active');
    renderResult(result);
    document.getElementById('result').classList.add('active');
  }, 2400);
}

// Σ⁻¹ 预计算的逆协方差矩阵（基于 16 位女性的 5 维向量）
const SIGMA_INV = [
  [ 1.5901, -0.9630, -0.9542, -1.0474,  0.2719],
  [-0.9630,  1.9043,  1.4849,  0.6040, -0.4563],
  [-0.9542,  1.4849,  1.8050,  0.7022, -0.6433],
  [-1.0474,  0.6040,  0.7022,  1.3543,  0.0767],
  [ 0.2719, -0.4563, -0.6433,  0.0767,  0.8414]
];

function normalize(vec) {
  const maxAbs = Math.max(...vec.map(Math.abs));
  if (maxAbs === 0) return vec.slice();
  return vec.map(v => v * 2 / maxAbs);
}

function mahalanobis(a, b) {
  const diff = [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3], a[4]-b[4]];
  let s = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      s += diff[i] * SIGMA_INV[i][j] * diff[j];
    }
  }
  return Math.sqrt(Math.max(s, 0));
}

function matchPersona() {
  const userNorm = normalize(userVec);

  console.log('=== HERTI Debug ===');
  console.log('Raw userVec:', userVec);
  console.log('Normalized:',  userNorm.map(v => v.toFixed(2)));

  const codes = Object.keys(PERSONAS);
  const distances = codes.map(c => ({
    code: c,
    dist: mahalanobis(userNorm, PERSONAS[c].vec)
  })).sort((a, b) => a.dist - b.dist);

  console.log('Top 5 matches:');
  distances.slice(0, 5).forEach(d =>
    console.log(`  ${d.code} (${PERSONAS[d.code].cn}): ${d.dist.toFixed(3)}`)
  );
  console.log('===================');

  return {
    primary: distances[0].code,
    mirror: distances[1].code,
    opposite: distances[distances.length - 1].code
  };
}

function renderResult(r) {
  const p = PERSONAS[r.primary];
  const mirror = PERSONAS[r.mirror];
  const opposite = PERSONAS[r.opposite];
  const idx = Object.keys(PERSONAS).indexOf(r.primary) + 1;

  const html = `
    <div class="brand-bar">
      <div class="logo">HERTI</div>
      <div class="meta">No.${String(idx).padStart(3, '0')} / 16</div>
    </div>

    <div class="hero">
      <div class="hero-label">你的人格类型是</div>
      <div class="hero-code">${r.primary}</div>
      <div class="hero-meaning">— ${p.source}</div>
      <div class="hero-cn-name">${p.cn}</div>
      <div class="epigraph">${p.epigraph}</div>
    </div>

    <div class="section">
      <div class="section-label">Persona</div>
      ${p.persona.map(t => `<p class="persona-text">${t}</p>`).join('')}
      <div class="tags">
        ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>

    <div class="ornament-mid">· · ·</div>

    <div class="soul-card">
      <div class="soul-label">Soul Origin · 灵魂原型</div>
      <div class="soul-name">${p.enName}</div>
      <div class="soul-name-cn">${p.cnName}</div>
      ${p.soul.map(t => `<p class="soul-text">${t}</p>`).join('')}
    </div>

    <div class="relations">
      <div class="relation-card">
        <div class="relation-label">your mirror · 镜像</div>
        <div class="relation-code">${r.mirror}</div>
        <div class="relation-name">${mirror.cn} · ${mirror.cnName}</div>
      </div>
      <div class="relation-card">
        <div class="relation-label">your opposite · 反面</div>
        <div class="relation-code">${r.opposite}</div>
        <div class="relation-name">${opposite.cn} · ${opposite.cnName}</div>
      </div>
    </div>

    <div class="footer">
      <div class="ornament-mid">· · ·</div>
      <p class="footer-quote">
        历史隐藏了她们,<br>
        但你的灵魂里,有一块碎片,<br>
        正以她的频率震动。
      </p>
      <p class="share-hint">
        把你的人格卡截图发到小红书,<br>
        让她,从你的朋友圈里,<br>
        遇见另一个她。
      </p>
      <button class="restart-btn" onclick="restart()">重 新 测 试</button>
      <p class="nominate">
        她们一共有十六位。<br>
        但其实,远不止十六位。<br>
        <em>你心里那一位,也许我还没遇见。<br>评论告诉我,下一版我去把她找出来。</em>
      </p>
      <div class="brand-foot">HERTI · 她的人格地图</div>
      ${getPageCreditsHtml()}
    </div>
  `;

  document.getElementById('result').innerHTML = html;
  window.scrollTo(0, 0);
}

function restart() {
  document.getElementById('result').classList.remove('active');
  document.getElementById('cover').style.display = 'flex';
  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('coverCreditsMount');
  if (mount) mount.innerHTML = getPageCreditsHtml();
});
