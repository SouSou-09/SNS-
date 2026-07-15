// ============================================================
// SNS経営シミュレーター UI
// ============================================================
'use strict';

const UI = {
  currentTab: 'dashboard',
  charts: {},

  // ---------- ユーティリティ ----------
  yen(v) {
    const abs = Math.abs(v);
    let str;
    if (abs >= 1e8) str = (abs / 1e8).toFixed(2) + '億';
    else if (abs >= 1e4) str = Math.round(abs / 1e4).toLocaleString() + '万';
    else str = Math.round(abs).toLocaleString();
    return (v < 0 ? '-¥' : '¥') + str;
  },
  num(v) {
    const abs = Math.abs(v);
    if (abs >= 1e8) return (v / 1e8).toFixed(2) + '億';
    if (abs >= 1e4) return (v / 1e4).toFixed(1) + '万';
    return Math.round(v).toLocaleString();
  },
  pct(v) { return Math.round(v * 100) + '%'; },
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },

  gauge(label, ratio, valText) {
    const p = Math.min(ratio, 1.5) * 100 / 1.5; // 150%上限表示
    const cls = ratio < 0.6 ? 'g-ok' : ratio < 0.95 ? 'g-warn' : 'g-danger';
    return `<div class="gauge">
      <div class="gauge-head"><span>${label}</span><span class="g-val">${valText} <span class="${ratio>=0.95?'val bad':ratio>=0.6?'val warn':'val good'}">(${Math.round(ratio*100)}%)</span></span></div>
      <div class="gauge-bar"><div class="gauge-fill ${cls}" style="width:${Math.min(100,p)}%"></div></div>
    </div>`;
  },

  // ---------- 初期化 ----------
  init() {
    document.getElementById('start-btn').addEventListener('click', () => {
      Game.newGame();
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      this.render();
      Game.play(1);
    });
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => this.switchTab(b.dataset.tab)));
    document.getElementById('btn-pause').addEventListener('click', () => Game.pause());
    document.getElementById('btn-play1').addEventListener('click', () => Game.play(1));
    document.getElementById('btn-play3').addEventListener('click', () => Game.play(3));
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    this.render();
  },

  // ---------- メイン描画 ----------
  render(fromTick = false) {
    const s = Game.state;
    if (!s) return;
    const r = Game.computeReport();
    this.renderKPI(s, r);
    this.renderLog(s);
    this.renderTimeControls();

    const el = document.getElementById('tab-' + this.currentTab);
    switch (this.currentTab) {
      case 'dashboard': this.renderDashboard(el, s, r, fromTick); break;
      case 'infra': this.renderInfra(el, s, r); break;
      case 'moderation': this.renderModeration(el, s, r); break;
      case 'bots': this.renderBots(el, s, r); break;
      case 'ads': this.renderAds(el, s, r); break;
      case 'crisis': this.renderCrisis(el, s, r); break;
      case 'staff': this.renderStaff(el, s, r); break;
      case 'finance': this.renderFinance(el, s, r); break;
    }
    if (s.gameOver) this.showEnd(s);
  },

  renderKPI(s, r) {
    document.getElementById('kpi-day').textContent = 'Day ' + s.day;
    const cashEl = document.getElementById('kpi-cash');
    cashEl.textContent = this.yen(s.cash).replace('¥','');
    cashEl.style.color = s.cash < 0 ? 'var(--bad)' : s.cash < 5000000 ? 'var(--warn)' : '';
    const pEl = document.getElementById('kpi-profit');
    pEl.textContent = (r.profit >= 0 ? '+' : '') + this.yen(r.profit).replace('¥','').replace('-','-');
    pEl.style.color = r.profit >= 0 ? 'var(--good)' : 'var(--bad)';
    document.getElementById('kpi-users').textContent = this.num(s.users);
    const satEl = document.getElementById('kpi-sat');
    satEl.textContent = Math.round(s.satisfaction);
    satEl.style.color = s.satisfaction >= 60 ? 'var(--good)' : s.satisfaction >= 45 ? 'var(--warn)' : 'var(--bad)';
    const trEl = document.getElementById('kpi-trust');
    trEl.textContent = Math.round(s.trust);
    trEl.style.color = s.trust >= 60 ? 'var(--good)' : s.trust >= 40 ? 'var(--warn)' : 'var(--bad)';

    const incKpi = document.getElementById('kpi-incident');
    incKpi.classList.toggle('hidden', s.incidents.length === 0);
    document.getElementById('kpi-incident-n').textContent = '炎上×' + s.incidents.length;

    // バッジ
    const bc = document.getElementById('badge-crisis');
    bc.classList.toggle('hidden', s.incidents.length === 0);
    bc.textContent = s.incidents.length;
    const bi = document.getElementById('badge-infra');
    bi.classList.toggle('hidden', r.worstUtil < 0.95);
    bi.textContent = '!';

    // 障害バナー
    document.getElementById('outage-banner').classList.toggle('hidden', !r.outage);
    document.getElementById('outage-err').textContent = Math.round(r.errorRate * 100) + '%';
  },

  renderTimeControls() {
    document.getElementById('btn-pause').classList.toggle('active', Game.paused);
    document.getElementById('btn-play1').classList.toggle('active', !Game.paused && Game.speed === 1);
    document.getElementById('btn-play3').classList.toggle('active', !Game.paused && Game.speed === 3);
  },

  renderLog(s) {
    document.getElementById('log-list').innerHTML = s.log.slice(0, 40).map(l =>
      `<li class="${l.type}"><span class="log-day">Day ${l.day}</span>${this.esc(l.msg)}</li>`).join('');
  },

  // ---------- ダッシュボード ----------
  renderDashboard(el, s, r, fromTick) {
    if (!el.dataset.built) {
      el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-gauge-high"></i>ダッシュボード</h2>
      <div class="card-grid">
        <div class="card"><h3><i class="fa-solid fa-users"></i>ユーザー動向</h3><div id="db-users"></div></div>
        <div class="card"><h3><i class="fa-solid fa-heart-pulse"></i>サービス品質</h3><div id="db-quality"></div></div>
        <div class="card"><h3><i class="fa-solid fa-server"></i>インフラ稼働率(ピーク)</h3><div id="db-infra"></div></div>
        <div class="card"><h3><i class="fa-solid fa-yen-sign"></i>本日の収支見込み</h3><div id="db-money"></div></div>
      </div>
      <div class="card"><h3><i class="fa-solid fa-chart-line"></i>ユーザー数の推移</h3><div class="chart-box"><canvas id="chart-users"></canvas></div></div>
      <div class="card-grid">
        <div class="card"><h3><i class="fa-solid fa-sack-dollar"></i>日次損益の推移</h3><div class="chart-box"><canvas id="chart-profit"></canvas></div></div>
        <div class="card"><h3><i class="fa-solid fa-face-smile"></i>満足度と負荷の推移</h3><div class="chart-box"><canvas id="chart-sat"></canvas></div></div>
      </div>`;
      el.dataset.built = '1';
      this.buildCharts();
    }
    const netGrowth = r.organicIn + r.promoIn - r.churnOut - r.wrongBanOut;
    document.getElementById('db-users').innerHTML = `
      <div class="stat-row"><span class="lbl">登録ユーザー</span><span class="val">${this.num(s.users)}人</span></div>
      <div class="stat-row"><span class="lbl">DAU(日次アクティブ)</span><span class="val">${this.num(r.dau)}人</span></div>
      <div class="stat-row"><span class="lbl">本日の純増見込み</span><span class="val ${netGrowth>=0?'good':'bad'}">${netGrowth>=0?'+':''}${this.num(netGrowth)}人</span></div>
      <div class="stat-row"><span class="lbl">└ 自然流入 / 広告流入</span><span class="val">+${this.num(r.organicIn)} / +${this.num(r.promoIn)}</span></div>
      <div class="stat-row"><span class="lbl">└ 離脱 / 誤BAN起因</span><span class="val bad">-${this.num(r.churnOut)} / -${this.num(r.wrongBanOut)}</span></div>
      <div class="stat-row"><span class="lbl">BOTアカウント</span><span class="val ${r.botRatio>0.08?'bad':'warn'}">${this.num(s.bots)} (${(r.botRatio*100).toFixed(1)}%)</span></div>`;
    document.getElementById('db-quality').innerHTML = `
      <div class="stat-row"><span class="lbl">満足度</span><span class="val ${s.satisfaction>=60?'good':s.satisfaction>=45?'warn':'bad'}">${s.satisfaction.toFixed(1)} / 100</span></div>
      <div class="stat-row"><span class="lbl">企業信頼度</span><span class="val ${s.trust>=60?'good':s.trust>=40?'warn':'bad'}">${s.trust.toFixed(1)} / 100</span></div>
      <div class="stat-row"><span class="lbl">平均レイテンシ</span><span class="val ${r.latency<150?'good':r.latency<350?'warn':'bad'}">${Math.round(r.latency)} ms</span></div>
      <div class="stat-row"><span class="lbl">エラー率</span><span class="val ${r.errorRate<0.01?'good':r.errorRate<0.2?'warn':'bad'}">${(r.errorRate*100).toFixed(1)}%</span></div>
      <div class="stat-row"><span class="lbl">フィード有害投稿率</span><span class="val ${r.toxicExposure<0.005?'good':r.toxicExposure<0.02?'warn':'bad'}">${(r.toxicExposure*100).toFixed(2)}%</span></div>
      <div class="stat-row"><span class="lbl">アクティブ炎上</span><span class="val ${s.incidents.length?'bad':'good'}">${s.incidents.length}件</span></div>`;
    document.getElementById('db-infra').innerHTML =
      this.gauge('Webサーバー', r.webUtil, `${Math.round(r.peakReqPerSec).toLocaleString()} / ${Math.round(r.cap.webReq).toLocaleString()} req/s`) +
      this.gauge('DBサーバー', r.dbUtil, `${Math.round(r.dbQueryPerSec).toLocaleString()} / ${Math.round(r.cap.dbQuery).toLocaleString()} q/s`) +
      this.gauge('回線帯域(CDN)', r.bwUtil, `${r.peakGbps.toFixed(1)} / ${r.cap.bandwidthGbps} Gbps`) +
      this.gauge('ストレージ', r.storageUtil, `${s.storageUsedTB.toFixed(1)} / ${r.cap.storageTB} TB`) +
      (s.autoScale ? `<p class="desc"><i class="fa-solid fa-cloud"></i> オートスケール有効 — 超過分はクラウド課金(本日 ${this.yen(r.autoScaleCost)})</p>` : '');
    document.getElementById('db-money').innerHTML = `
      <div class="stat-row"><span class="lbl">広告収益</span><span class="val good">+${this.yen(r.adRevenue)}</span></div>
      <div class="stat-row"><span class="lbl">プレミアム収益</span><span class="val good">+${this.yen(r.premiumRevenue)}</span></div>
      <div class="stat-row"><span class="lbl">費用合計</span><span class="val bad">-${this.yen(r.cost)}</span></div>
      <div class="stat-row"><span class="lbl">日次損益</span><span class="val ${r.profit>=0?'good':'bad'}">${r.profit>=0?'+':''}${this.yen(r.profit)}</span></div>
      <div class="stat-row"><span class="lbl">資金</span><span class="val ${s.cash>=0?'':'bad'}">${this.yen(s.cash)}</span></div>`;
    this.updateCharts(s);
  },

  buildCharts() {
    const gridCfg = { color: '#232c3d' };
    const mkOpts = extra => ({
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: '#8b98ab', boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#8b98ab', maxTicksLimit: 8 }, grid: gridCfg },
        y: { ticks: { color: '#8b98ab' }, grid: gridCfg, ...extra },
      },
    });
    this.charts.users = new Chart(document.getElementById('chart-users'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'ユーザー数', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.12)', fill: true, pointRadius: 0, tension: .3 }] },
      options: mkOpts({ beginAtZero: true }),
    });
    this.charts.profit = new Chart(document.getElementById('chart-profit'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: '日次損益(¥)', data: [], backgroundColor: ctx => (ctx.raw >= 0 ? 'rgba(74,222,128,.7)' : 'rgba(248,113,113,.7)') }] },
      options: mkOpts({}),
    });
    this.charts.sat = new Chart(document.getElementById('chart-sat'), {
      type: 'line',
      data: { labels: [], datasets: [
        { label: '満足度', data: [], borderColor: '#4ade80', pointRadius: 0, tension: .3 },
        { label: '最大負荷率(%)', data: [], borderColor: '#fbbf24', pointRadius: 0, tension: .3 },
      ] },
      options: mkOpts({ min: 0, max: 150 }),
    });
  },

  updateCharts(s) {
    if (!this.charts.users) return;
    const h = s.history;
    const labels = h.users.map((_, i) => 'D' + (s.day - h.users.length + i + 1));
    this.charts.users.data.labels = labels;
    this.charts.users.data.datasets[0].data = h.users;
    this.charts.users.update();
    this.charts.profit.data.labels = labels;
    this.charts.profit.data.datasets[0].data = h.profit;
    this.charts.profit.update();
    this.charts.sat.data.labels = labels;
    this.charts.sat.data.datasets[0].data = h.satisfaction;
    this.charts.sat.data.datasets[1].data = h.load;
    this.charts.sat.update();
  },

  // ---------- インフラ ----------
  renderInfra(el, s, r) {
    const pendingByKey = {};
    s.pendingOrders.forEach(o => pendingByKey[o.key] = (pendingByKey[o.key] || 0) + o.count);

    const serverCard = key => {
      const sv = CONFIG.SERVERS[key];
      const own = s.servers[key] || 0;
      const pend = pendingByKey[key] || 0;
      return `<div class="card server-card">
        <div class="server-head"><i class="fa-solid ${sv.icon}"></i>
          <div><div class="sv-name">${sv.name}</div><div class="sv-spec">${sv.spec}</div></div>
        </div>
        <div class="server-meta">
          <span>処理能力: <b>${sv.cap.toLocaleString()} ${sv.capUnit}</b>/台</span>
          <span>価格: ${this.yen(sv.price)}</span>
          <span>維持費: ${this.yen(sv.upkeep)}/日</span>
          <span>納期: ${sv.delivery}日</span>
        </div>
        <div class="server-own">稼働中: <b>${own}</b> 台 ${pend ? `<span class="pending-tag"><i class="fa-solid fa-truck"></i> 納品待ち +${pend}</span>` : ''}</div>
        <div class="server-actions">
          <button class="btn-sm" onclick="Game.buyServer('${key}',1)" ${s.cash < sv.price ? 'disabled' : ''}>+1 購入</button>
          <button class="btn-sm" onclick="Game.buyServer('${key}',5)" ${s.cash < sv.price * 5 ? 'disabled' : ''}>+5 購入</button>
          <button class="btn-sm danger" onclick="Game.sellServer('${key}',1)" ${own < 1 ? 'disabled' : ''}>-1 売却(35%)</button>
        </div>
      </div>`;
    };

    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-server"></i>インフラ管理</h2>
      <div class="card">
        <h3><i class="fa-solid fa-gauge-high"></i>現在のピーク負荷 <span class="desc">(夜間ピーク帯${CONFIG.PEAK_FACTOR}倍で計算。BOTも負荷を発生させます)</span></h3>
        ${this.gauge('Webサーバー(APリクエスト)', r.webUtil, `${Math.round(r.peakReqPerSec).toLocaleString()} / ${Math.round(r.cap.webReq).toLocaleString()} req/s`)}
        ${this.gauge('DBサーバー(クエリ)', r.dbUtil, `${Math.round(r.dbQueryPerSec).toLocaleString()} / ${Math.round(r.cap.dbQuery).toLocaleString()} q/s`)}
        ${this.gauge('回線帯域(CDN契約)', r.bwUtil, `${r.peakGbps.toFixed(1)} / ${r.cap.bandwidthGbps} Gbps`)}
        ${this.gauge('ストレージ使用量', r.storageUtil, `${s.storageUsedTB.toFixed(1)} / ${r.cap.storageTB} TB`)}
        ${this.gauge('GPU使用状況', r.cap.gpuUnits > 0 ? r.gpu.total / r.cap.gpuUnits : (r.gpu.total > 0 ? 1.5 : 0), `${r.gpu.total.toFixed(1)} / ${r.cap.gpuUnits} ユニット`)}
        <p class="desc">キャッシュヒット: ${Math.round(r.cacheHit).toLocaleString()} q/s をRedisが吸収(DB負荷 -${Math.round(r.cacheHit / Math.max(r.rawQueryPerSec,1) * 100)}%) / 平均レイテンシ ${Math.round(r.latency)}ms / エラー率 ${(r.errorRate*100).toFixed(1)}%</p>
        <p class="desc"><i class="fa-solid fa-lightbulb"></i> 稼働率60%を超えると遅延が増加し、100%を超えると障害が発生します。エンジニア1人につき総容量+2%。</p>
      </div>

      <div class="card">
        <h3><i class="fa-solid fa-cloud"></i>CDN契約・オートスケール</h3>
        <div class="toggle-row">
          <div><b>CDN帯域契約</b><div class="desc">1契約=10Gbps、${this.yen(CONFIG.CDN_UNIT_COST)}/日。即日反映。</div></div>
          <div class="staff-btns">
            <button onclick="Game.setCdn(${s.cdnUnits - 1})" ${s.cdnUnits <= 0 ? 'disabled' : ''}>−</button>
            <span class="staff-count">${s.cdnUnits}</span>
            <button onclick="Game.setCdn(${s.cdnUnits + 1})">+</button>
          </div>
        </div>
        <div class="toggle-row">
          <div><b>クラウドオートスケール</b><div class="desc">容量不足分を自動でクラウド補填。障害は防げるが自前サーバーの約3倍のコスト。本日概算: ${this.yen(r.autoScaleCost)}</div></div>
          <div class="switch ${s.autoScale ? 'on' : ''}" onclick="Game.toggleAutoScale()" role="switch" aria-checked="${s.autoScale}"></div>
        </div>
      </div>

      <h3 style="margin:18px 0 10px;font-size:16px;"><i class="fa-solid fa-cart-shopping" style="color:var(--accent)"></i> サーバー調達</h3>
      <div class="card-grid">${Object.keys(CONFIG.SERVERS).map(serverCard).join('')}</div>`;
  },

  // ---------- モデレーション ----------
  renderModeration(el, s, r) {
    const tierHtml = CONFIG.AI_TIERS.map((t, i) => `
      <div class="tier-item ${s.aiModTier === i ? 'selected' : ''}" onclick="Game.setAiMod(${i})">
        <span class="tier-check">${s.aiModTier === i ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle"></i>'}</span>
        <div class="tier-info"><div class="tier-name">${t.name}</div><div class="tier-desc">${t.desc}</div></div>
        <div class="tier-cost">${t.license ? 'ライセンス ' + this.yen(t.license) + '/日' : '無料'}${t.gpuPer ? '<br>要GPU' : ''}</div>
      </div>`).join('');

    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-shield-halved"></i>コンテンツモデレーション</h2>
      <div class="card">
        <h3><i class="fa-solid fa-chart-pie"></i>本日の審査状況</h3>
        <div class="stat-row"><span class="lbl">総投稿数(BOT投稿含む)</span><span class="val">${this.num(r.posts)}件/日</span></div>
        <div class="stat-row"><span class="lbl">有害投稿</span><span class="val warn">${this.num(r.toxicPosts)}件 (${(r.toxicPosts/Math.max(r.posts,1)*100).toFixed(2)}%)</span></div>
        <div class="stat-row"><span class="lbl">AI検出</span><span class="val good">${this.num(r.aiCaught)}件 (実効検出率${(r.aiDetect*100).toFixed(0)}%)</span></div>
        <div class="stat-row"><span class="lbl">人間モデレーター処理</span><span class="val good">${this.num(r.humanCaught)}件 (能力上限 ${this.num(r.humanCap)}件)</span></div>
        <div class="stat-row"><span class="lbl">すり抜けてフィードに表示</span><span class="val ${r.toxicExposure<0.005?'good':r.toxicExposure<0.02?'warn':'bad'}">${this.num(r.toxicVisible)}件 (汚染率${(r.toxicExposure*100).toFixed(2)}%)</span></div>
        <div class="stat-row"><span class="lbl">AI誤BAN(無実の凍結)</span><span class="val ${r.falseBans>5?'bad':'warn'}">${r.falseBans.toFixed(1)}アカウント/日</span></div>
        ${r.modAiCover < 1 && CONFIG.AI_TIERS[s.aiModTier].gpuPer > 0 ? `<p class="desc" style="color:var(--bad)"><i class="fa-solid fa-triangle-exclamation"></i> GPU不足!AIは全投稿の${Math.round(r.modAiCover*100)}%しか処理できていません。GPUサーバーを増設してください。</p>` : ''}
        <p class="desc"><i class="fa-solid fa-lightbulb"></i> 有害投稿の放置は満足度低下と「差別的投稿放置」炎上の原因に。逆に高性能AIは誤BANを生み、「誤BAN騒動」炎上のリスクがあります。BOTが増えると有害投稿率も上がります。</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-robot"></i>AIモデレーションシステム</h3>
        <div class="tier-list">${tierHtml}</div>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-user-check"></i>人間モデレーター: ${s.staff.mod}人 <span class="desc">(1人 ${CONFIG.MOD_CAP_PER_HUMAN}件/日・精度95%・${this.yen(CONFIG.STAFF.mod.cost)}/日)</span></h3>
        <div class="staff-btns" style="justify-content:flex-start">
          <button onclick="Game.hire('mod',-1)" ${s.staff.mod <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff.mod}</span>
          <button onclick="Game.hire('mod',1)" ${s.staff.mod >= CONFIG.STAFF.mod.max ? 'disabled' : ''}>+</button>
          <button class="btn-sm" onclick="Game.hire('mod',5)" ${s.staff.mod + 5 > CONFIG.STAFF.mod.max ? 'disabled' : ''}>+5人</button>
        </div>
        <p class="desc">AIがすり抜けた分を人力でカバーします。人間は精度95%と高いですが処理数に限界があります。</p>
      </div>`;
  },

  // ---------- BOT対策 ----------
  renderBots(el, s, r) {
    const tierHtml = CONFIG.BOT_AI_TIERS.map((t, i) => `
      <div class="tier-item ${s.botAiTier === i ? 'selected' : ''}" onclick="Game.setBotAi(${i})">
        <span class="tier-check">${s.botAiTier === i ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle"></i>'}</span>
        <div class="tier-info"><div class="tier-name">${t.name}</div><div class="tier-desc">${t.desc}</div></div>
        <div class="tier-cost">${t.license ? 'ライセンス ' + this.yen(t.license) + '/日' : '無料'}${t.gpuPer ? '<br>要GPU' : ''}</div>
      </div>`).join('');

    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-robot"></i>BOT対策</h2>
      <div class="card">
        <h3><i class="fa-solid fa-chart-pie"></i>BOT情勢</h3>
        <div class="stat-row"><span class="lbl">推定BOT数</span><span class="val ${r.botRatio>0.08?'bad':'warn'}">${this.num(s.bots)}体 (全体の${(r.botRatio*100).toFixed(1)}%)</span></div>
        <div class="stat-row"><span class="lbl">本日の新規流入見込み</span><span class="val bad">+${this.num(r.botInflow)}体 (登録ブロック率${Math.round(r.signupBlock*100)}%)</span></div>
        <div class="stat-row"><span class="lbl">AI検知によるBAN</span><span class="val good">-${this.num(r.botBanAi)}体/日</span></div>
        <div class="stat-row"><span class="lbl">通報対応チームによるBAN</span><span class="val good">-${this.num(r.botBanReport)}体/日</span></div>
        <div class="stat-row"><span class="lbl">BOTによるサーバー負荷</span><span class="val warn">${this.num(s.bots * CONFIG.BOT_LOAD_FACTOR * CONFIG.ACTIONS_PER_DAU)}req/日 相当</span></div>
        ${r.botAiCover < 1 && CONFIG.BOT_AI_TIERS[s.botAiTier].gpuPer > 0 ? `<p class="desc" style="color:var(--bad)"><i class="fa-solid fa-triangle-exclamation"></i> GPU不足!BOT検知AIの性能が${Math.round(r.botAiCover*100)}%に低下しています(モデレーションAIが優先)。</p>` : ''}
        <p class="desc"><i class="fa-solid fa-lightbulb"></i> BOT比率が上がると: 広告単価の下落(広告主の値引き要求)、有害投稿増、サーバー負荷増、満足度低下、「スパムBOT大量発生」炎上の原因になります。</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-door-closed"></i>入口対策(新規登録)</h3>
        <div class="toggle-row">
          <div><b>${CONFIG.CAPTCHA.name}</b><div class="desc">BOT登録を${Math.round(CONFIG.CAPTCHA.block*100)}%ブロック / 新規ユーザー獲得-${Math.round(CONFIG.CAPTCHA.convPenalty*100)}% / ${this.yen(CONFIG.CAPTCHA.cost)}/日</div></div>
          <div class="switch ${s.captcha ? 'on' : ''}" onclick="Game.toggleCaptcha()" role="switch" aria-checked="${s.captcha}"></div>
        </div>
        <div class="toggle-row">
          <div><b>${CONFIG.SMS.name}</b><div class="desc">残りのBOTをさらに${Math.round(CONFIG.SMS.block*100)}%ブロック / 新規ユーザー獲得-${Math.round(CONFIG.SMS.convPenalty*100)}% / ${this.yen(CONFIG.SMS.cost)}/日</div></div>
          <div class="switch ${s.smsVerify ? 'on' : ''}" onclick="Game.toggleSms()" role="switch" aria-checked="${s.smsVerify}"></div>
        </div>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-magnifying-glass"></i>BOT検知AI(既存BOTの排除)</h3>
        <div class="tier-list">${tierHtml}</div>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-flag"></i>通報対応チーム: ${s.staff.reportTeam}人 <span class="desc">(1人あたりBOT ${CONFIG.REPORT_BAN_PER_STAFF}体/日をBAN・${this.yen(CONFIG.STAFF.reportTeam.cost)}/日)</span></h3>
        <div class="staff-btns" style="justify-content:flex-start">
          <button onclick="Game.hire('reportTeam',-1)" ${s.staff.reportTeam <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff.reportTeam}</span>
          <button onclick="Game.hire('reportTeam',1)" ${s.staff.reportTeam >= CONFIG.STAFF.reportTeam.max ? 'disabled' : ''}>+</button>
          <button class="btn-sm" onclick="Game.hire('reportTeam',5)" ${s.staff.reportTeam + 5 > CONFIG.STAFF.reportTeam.max ? 'disabled' : ''}>+5人</button>
        </div>
      </div>`;
  },

  // ---------- 広告 ----------
  renderAds(el, s, r) {
    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-rectangle-ad"></i>広告・収益</h2>
      <div class="card">
        <h3><i class="fa-solid fa-chart-column"></i>収益状況</h3>
        <div class="stat-row"><span class="lbl">広告インプレッション</span><span class="val">${this.num(r.impressions)}imp/日</span></div>
        <div class="stat-row"><span class="lbl">実効eCPM(千imp単価)</span><span class="val ${r.ecpm>120?'good':'warn'}">¥${r.ecpm.toFixed(0)}</span></div>
        <div class="stat-row"><span class="lbl">広告収益</span><span class="val good">+${this.yen(r.adRevenue)}/日</span></div>
        <div class="stat-row"><span class="lbl">プレミアム会員(${(s.premiumRate*100).toFixed(1)}%加入)</span><span class="val good">+${this.yen(r.premiumRevenue)}/日</span></div>
        <p class="desc"><i class="fa-solid fa-lightbulb"></i> eCPMは 満足度・企業信頼度・BOT比率・障害の有無 で変動します。BOT比率${(r.botRatio*100).toFixed(1)}%による値引き圧力: eCPM ×${Math.max(0.3, 1 - r.botRatio * 2.5).toFixed(2)}</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-sliders"></i>広告表示率: <span style="color:var(--accent)">${s.adLoad}%</span></h3>
        <input type="range" min="0" max="${CONFIG.AD_LOAD_MAX}" value="${s.adLoad}" oninput="Game.setAdLoad(+this.value)">
        <p class="desc">フィードに占める広告の割合。10%を超えると満足度がじわじわ低下します。上限${CONFIG.AD_LOAD_MAX}%。</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-magnifying-glass-dollar"></i>広告審査基準</h3>
        <div class="tier-list">
          ${[
            { q: 0, n: '低審査(なんでも掲載)', d: 'eCPM +25%。ただし悪質広告炎上リスク大・満足度低下' },
            { q: 1, n: '標準審査', d: 'バランス型。稀に悪質広告が紛れ込む' },
            { q: 2, n: '厳格審査', d: 'eCPM -15%。炎上リスク最小・ブランド価値向上' },
          ].map(o => `
          <div class="tier-item ${s.adQuality === o.q ? 'selected' : ''}" onclick="Game.setAdQuality(${o.q})">
            <span class="tier-check">${s.adQuality === o.q ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-regular fa-circle"></i>'}</span>
            <div class="tier-info"><div class="tier-name">${o.n}</div><div class="tier-desc">${o.d}</div></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-bullhorn"></i>マーケティング予算: <span style="color:var(--accent)">${this.yen(s.promoBudget)}/日</span></h3>
        <input type="range" min="0" max="3000000" step="50000" value="${s.promoBudget}" oninput="Game.setPromo(+this.value)">
        <p class="desc">獲得単価(CPA)は約${this.yen(CONFIG.PROMO_CPA_BASE)}〜。満足度が低いと単価が悪化します。現在の見込み: +${this.num(r.promoIn)}人/日</p>
      </div>
      <div class="card">
        <h3><i class="fa-solid fa-user-tie"></i>広告営業: ${s.staff.adSales}人 <span class="desc">(eCPM+3%/人・${this.yen(CONFIG.STAFF.adSales.cost)}/日)</span></h3>
        <div class="staff-btns" style="justify-content:flex-start">
          <button onclick="Game.hire('adSales',-1)" ${s.staff.adSales <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff.adSales}</span>
          <button onclick="Game.hire('adSales',1)" ${s.staff.adSales >= CONFIG.STAFF.adSales.max ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
  },

  // ---------- 炎上対応 ----------
  renderCrisis(el, s, r) {
    let body;
    if (s.incidents.length === 0) {
      body = `<div class="card"><div class="no-incident"><i class="fa-solid fa-dove"></i>現在、炎上は発生していません。<br><span class="desc">有害投稿の放置・誤BAN・障害・悪質広告・BOT放置が炎上の火種になります。</span></div></div>`;
    } else {
      body = s.incidents.map(inc => {
        const respBtns = CONFIG.RESPONSES.map(resp => {
          const cost = resp.cost ?? (resp.costBase + resp.costPerSev * inc.sev);
          const prob = Math.max(0.05, Math.min(0.97, resp.base + s.staff.pr * 0.04 + (s.trust - 50) * 0.003 + (resp.id === 'silence' && inc.sev <= 1 ? resp.smallBonus : 0)));
          return `<button class="resp-btn" onclick="Game.respondIncident(${inc.uid},'${resp.id}')">
            <b>${resp.name}</b>
            <span class="r-cost">${cost ? this.yen(cost) : '無料'}</span> / 成功率約${Math.round(prob * 100)}%<br>
            <span class="desc">${resp.desc}</span>
          </button>`;
        }).join('');
        return `<div class="card incident-card">
          <div class="incident-head"><i class="fa-solid ${inc.icon}"></i>
            <div><b>${inc.name}</b> <span class="sev-stars">${'★'.repeat(inc.sev)}${'☆'.repeat(4 - inc.sev)}</span>
            <div class="desc">${inc.desc}</div></div>
          </div>
          <div class="gauge-head"><span>炎上ヒート(発生${inc.age}日目)</span><span class="g-val">${Math.round(inc.heat)} / 150</span></div>
          <div class="heat-bar"><div class="heat-fill" style="width:${Math.min(100, inc.heat / 150 * 100)}%"></div></div>
          <div class="resp-grid">${respBtns}</div>
        </div>`;
      }).join('');
    }
    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-fire"></i>炎上対応</h2>
      ${body}
      <div class="card">
        <h3><i class="fa-solid fa-bullhorn"></i>広報(PR)スタッフ: ${s.staff.pr}人 <span class="desc">(対応成功率+4%/人・自然鎮火加速・${this.yen(CONFIG.STAFF.pr.cost)}/日)</span></h3>
        <div class="staff-btns" style="justify-content:flex-start">
          <button onclick="Game.hire('pr',-1)" ${s.staff.pr <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff.pr}</span>
          <button onclick="Game.hire('pr',1)" ${s.staff.pr >= CONFIG.STAFF.pr.max ? 'disabled' : ''}>+</button>
        </div>
        <p class="desc">炎上はヒートが高いほどユーザー離脱と信頼低下が加速します。放置すると数日は延焼し続けます。企業信頼度が高いと対応が成功しやすくなります。</p>
      </div>`;
  },

  // ---------- 人材 ----------
  renderStaff(el, s, r) {
    const rows = Object.keys(CONFIG.STAFF).map(k => {
      const st = CONFIG.STAFF[k];
      return `<div class="staff-row">
        <div class="staff-info"><div class="staff-name">${st.name}</div><div class="desc">${st.desc} / ${this.yen(st.cost)}/日 (最大${st.max}人)</div></div>
        <div class="staff-btns">
          <button onclick="Game.hire('${k}',-1)" ${s.staff[k] <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff[k]}</span>
          <button onclick="Game.hire('${k}',1)" ${s.staff[k] >= st.max ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    }).join('');
    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-user-tie"></i>人材管理</h2>
      <div class="card">${rows}
        <div class="stat-row" style="margin-top:10px"><span class="lbl">人件費合計</span><span class="val bad">-${this.yen(r.staffCost)}/日</span></div>
      </div>`;
  },

  // ---------- 財務 ----------
  renderFinance(el, s, r) {
    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-file-invoice-yen"></i>財務(本日の見込みP/L)</h2>
      <div class="card-grid">
        <div class="card"><h3><i class="fa-solid fa-arrow-trend-up"></i>収益</h3>
          <table class="fin-table">
            <tr><td>広告収益 (${this.num(r.impressions)}imp × eCPM¥${r.ecpm.toFixed(0)})</td><td style="color:var(--good)">+${this.yen(r.adRevenue)}</td></tr>
            <tr><td>プレミアム会員収益</td><td style="color:var(--good)">+${this.yen(r.premiumRevenue)}</td></tr>
            <tr class="total"><td>収益合計</td><td style="color:var(--good)">+${this.yen(r.revenue)}</td></tr>
          </table>
        </div>
        <div class="card"><h3><i class="fa-solid fa-arrow-trend-down"></i>費用</h3>
          <table class="fin-table">
            <tr><td>サーバー維持費(電気・保守)</td><td>-${this.yen(r.upkeep)}</td></tr>
            <tr><td>CDN契約 (${s.cdnUnits}契約)</td><td>-${this.yen(r.cdnCost)}</td></tr>
            <tr><td>クラウドオートスケール従量課金</td><td>-${this.yen(r.autoScaleCost)}</td></tr>
            <tr><td>人件費</td><td>-${this.yen(r.staffCost)}</td></tr>
            <tr><td>AIライセンス料</td><td>-${this.yen(r.licenseCost)}</td></tr>
            <tr><td>認証サービス(CAPTCHA/SMS)</td><td>-${this.yen(r.securityCost)}</td></tr>
            <tr><td>マーケティング費</td><td>-${this.yen(r.promoCost)}</td></tr>
            <tr><td>オフィス・その他固定費</td><td>-${this.yen(r.officeCost)}</td></tr>
            <tr class="total"><td>費用合計</td><td style="color:var(--bad)">-${this.yen(r.cost)}</td></tr>
          </table>
        </div>
      </div>
      <div class="card">
        <table class="fin-table">
          <tr class="total"><td>日次損益</td><td style="color:${r.profit >= 0 ? 'var(--good)' : 'var(--bad)'}">${r.profit >= 0 ? '+' : ''}${this.yen(r.profit)}</td></tr>
          <tr><td>現在資金</td><td>${this.yen(s.cash)}</td></tr>
          <tr><td>累計損益(Day ${s.day})</td><td>${this.yen(s.totalProfit)}</td></tr>
          <tr><td>倒産ライン</td><td style="color:var(--bad)">${this.yen(CONFIG.BANKRUPT_LINE)}</td></tr>
        </table>
        <p class="desc" style="margin-top:8px"><i class="fa-solid fa-lightbulb"></i> ユーザーマイルストーン達成で資金調達ボーナスが得られます。次の目標: ${(() => { const next = CONFIG.MILESTONES.find(m => !s.milestonesHit.includes(m.users)); return next ? this.num(next.users) + '人' : '達成済み!'; })()}</p>
      </div>`;
  },

  // ---------- モーダル ----------
  showIncidentAlert(inc) {
    document.getElementById('incident-modal-body').innerHTML = `
      <div style="font-size:40px;margin-bottom:10px"><i class="fa-solid ${inc.icon}" style="color:var(--bad)"></i></div>
      <h3 style="margin-bottom:8px">${inc.name} <span class="sev-stars">${'★'.repeat(inc.sev)}${'☆'.repeat(4-inc.sev)}</span></h3>
      <p class="desc">${inc.desc}</p>
      <p style="margin-top:10px;font-size:13px;color:var(--warn)">放置すると延焼し、ユーザー離脱と信頼低下が加速します。</p>`;
    document.getElementById('incident-modal').classList.remove('hidden');
  },
  closeIncidentModal() {
    document.getElementById('incident-modal').classList.add('hidden');
    this.switchTab('crisis');
  },

  showEnd(s) {
    const modal = document.getElementById('end-modal');
    if (!modal.classList.contains('hidden')) return;
    const box = document.getElementById('end-modal-box');
    if (s.won) {
      box.innerHTML = `
        <div style="font-size:56px">🏆</div>
        <div class="end-title" style="color:var(--gold)">1,000万ユーザー達成!</div>
        <p>Chirperは国民的SNSとなりました。あなたの経営手腕は伝説として語り継がれます。</p>
        ${this.endStats(s)}
        <button class="btn-primary" onclick="location.reload()">もう一度プレイ</button>`;
    } else {
      box.innerHTML = `
        <div style="font-size:56px">💀</div>
        <div class="end-title" style="color:var(--bad)">倒産…</div>
        <p>負債が限度額を超え、Chirperはサービス終了となりました。</p>
        ${this.endStats(s)}
        <button class="btn-primary" onclick="location.reload()">再挑戦する</button>`;
    }
    modal.classList.remove('hidden');
  },
  endStats(s) {
    return `<div class="end-stats card">
      <div class="stat-row"><span class="lbl">経営日数</span><span class="val">${s.day}日</span></div>
      <div class="stat-row"><span class="lbl">最終ユーザー数</span><span class="val">${this.num(s.users)}人</span></div>
      <div class="stat-row"><span class="lbl">最終資金</span><span class="val">${this.yen(s.cash)}</span></div>
      <div class="stat-row"><span class="lbl">累計損益</span><span class="val">${this.yen(s.totalProfit)}</span></div>
    </div>`;
  },
};

document.addEventListener('DOMContentLoaded', () => UI.init());
