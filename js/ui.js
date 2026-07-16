// ============================================================
// SNS経営シミュレーター UI
// ============================================================
'use strict';

const UI = {
  currentTab: 'dashboard',
  feedFilter: 'all',
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
    const openGame = () => {
      document.getElementById('title-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      this.render();
      if (!Game.state.gameOver) Game.play(1);
    };

    const continueBtn = document.getElementById('continue-btn');
    continueBtn.classList.toggle('hidden', !Game.hasSave());
    document.getElementById('start-btn').addEventListener('click', () => {
      Game.newGame();
      openGame();
    });
    continueBtn.addEventListener('click', () => {
      if (Game.loadGame()) openGame();
      else {
        continueBtn.classList.add('hidden');
        document.getElementById('save-note').textContent = 'セーブデータを読み込めませんでした。新しくゲームを開始してください。';
      }
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
    Game.saveGame();
    const r = Game.computeReport();
    this.renderKPI(s, r);
    this.renderFeed(s);
    this.renderTimeControls();

    const el = document.getElementById('tab-' + this.currentTab);
    switch (this.currentTab) {
      case 'dashboard': this.renderDashboard(el, s, r, fromTick); break;
      case 'infra': this.renderInfra(el, s, r); break;
      case 'strategy': this.renderStrategy(el, s, r); break;
      case 'moderation': this.renderModeration(el, s, r); break;
      case 'bots': this.renderBots(el, s, r); break;
      case 'ads': this.renderAds(el, s, r); break;
      case 'crisis': this.renderCrisis(el, s, r); break;
      case 'competitors': this.renderCompetitors(el, s, r); break;
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

    const attentionCount = s.incidents.length + (s.buzzPosts?.length || 0);
    const incKpi = document.getElementById('kpi-incident');
    incKpi.classList.toggle('hidden', attentionCount === 0);
    document.getElementById('kpi-incident-n').textContent = '注目×' + attentionCount;

    // バッジ
    const bc = document.getElementById('badge-crisis');
    bc.classList.toggle('hidden', attentionCount === 0);
    bc.textContent = attentionCount;
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

  setFeedFilter(filter) {
    this.feedFilter = filter;
    document.querySelectorAll('.feed-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.feed === filter));
    if (Game.state) this.renderFeed(Game.state);
  },

  renderFeed(s) {
    const list = document.getElementById('timeline-list');
    if (!list) return;

    const posts = (s.timeline || []).map((post, index) => ({ ...post, kind: 'post', sort: post.day * 1000 + post.hour * 10 - index / 100 }));
    const news = s.log.map((item, index) => ({ ...item, kind: 'news', sort: item.day * 1000 + 235 - index / 100 }));
    let entries = this.feedFilter === 'posts' ? posts : this.feedFilter === 'news' ? news : posts.concat(news);
    entries = entries.sort((a, b) => b.sort - a.sort).slice(0, this.feedFilter === 'all' ? 42 : 50);

    if (entries.length === 0) {
      list.innerHTML = '<div class="feed-empty">まだ表示できるポストがありません。</div>';
      return;
    }

    list.innerHTML = entries.map(item => {
      if (item.kind === 'news') {
        return `<article class="news-entry ${item.type}">
          <div class="news-icon"><i class="fa-solid fa-bullhorn"></i></div>
          <div><div class="news-meta">Chirper運営 <span>· Day ${item.day}</span></div><p>${this.esc(item.msg)}</p></div>
        </article>`;
      }
      return `<article class="timeline-post">
        <div class="post-avatar" style="--avatar-color:${item.color}">${this.esc(item.avatar)}</div>
        <div class="post-body">
          <div class="post-author"><strong>${this.esc(item.name)}</strong>${item.verified ? '<i class="fa-solid fa-circle-check" title="認証済み"></i>' : ''}<span>${this.esc(item.handle)} · Day ${item.day} ${String(item.hour).padStart(2, '0')}:00</span></div>
          <p class="post-text">${this.esc(item.text)}</p>
          <div class="post-actions" aria-label="ポストの反応">
            <span title="返信"><i class="fa-regular fa-comment"></i>${this.num(item.replies)}</span>
            <span title="リポスト"><i class="fa-solid fa-retweet"></i>${this.num(item.reposts)}</span>
            <span title="いいね"><i class="fa-regular fa-heart"></i>${this.num(item.likes)}</span>
            <span title="表示"><i class="fa-solid fa-chart-simple"></i>${this.num(item.views)}</span>
          </div>
        </div>
      </article>`;
    }).join('');
  },

  // ---------- ダッシュボード ----------
  renderDashboard(el, s, r, fromTick) {
    if (!el.dataset.built) {
      el.innerHTML = `
      <div class="dashboard-heading">
        <div>
          <span class="eyebrow">EXECUTIVE OVERVIEW</span>
          <h2 class="section-title"><i class="fa-solid fa-gauge-high"></i>ダッシュボード</h2>
        </div>
        <p>今日の経営状態と、優先して確認すべき変化をまとめています。</p>
      </div>

      <div id="db-overview" class="dashboard-overview" aria-label="主要経営指標"></div>

      <div class="social-pulse card dashboard-panel">
        <div class="panel-heading"><span class="eyebrow">TODAY'S COMMUNITY</span><h3><i class="fa-solid fa-comments"></i>SNS内の今日の動き</h3></div>
        <div id="db-social" class="pulse-grid"></div>
      </div>

      <div class="dashboard-primary-grid">
        <section class="card dashboard-panel dashboard-users"><h3><i class="fa-solid fa-users"></i>ユーザー動向</h3><div id="db-users"></div></section>
        <section class="card dashboard-panel dashboard-quality"><h3><i class="fa-solid fa-heart-pulse"></i>サービス品質</h3><div id="db-quality"></div></section>
        <section class="card dashboard-panel dashboard-infra"><h3><i class="fa-solid fa-server"></i>インフラ稼働率 <span>ピーク時</span></h3><div id="db-infra"></div></section>
        <section class="card dashboard-panel dashboard-money"><h3><i class="fa-solid fa-yen-sign"></i>本日の収支見込み</h3><div id="db-money"></div></section>
      </div>

      <div class="dashboard-insights-grid">
        <section class="card dashboard-panel"><h3><i class="fa-solid fa-arrow-trend-up"></i>いまのトレンド</h3><div id="db-trends"></div></section>
        <section class="card dashboard-panel"><h3><i class="fa-solid fa-people-group"></i>ユーザー層</h3><div id="db-segments"></div></section>
      </div>

      <section class="card dashboard-panel dashboard-chart-wide"><h3><i class="fa-solid fa-chart-line"></i>ユーザー数の推移</h3><div class="chart-box chart-box-primary"><canvas id="chart-users"></canvas></div></section>
      <div class="dashboard-chart-grid">
        <section class="card dashboard-panel"><h3><i class="fa-solid fa-sack-dollar"></i>日次損益の推移</h3><div class="chart-box"><canvas id="chart-profit"></canvas></div></section>
        <section class="card dashboard-panel"><h3><i class="fa-solid fa-face-smile"></i>満足度と負荷の推移</h3><div class="chart-box"><canvas id="chart-sat"></canvas></div></section>
      </div>`;
      el.dataset.built = '1';
      this.buildCharts();
    }
    const netGrowth = r.organicIn + r.promoIn + r.competitorInflow - r.competitorOutflow - r.churnOut - r.wrongBanOut;
    const loadStatus = r.worstUtil < 0.6 ? '安定' : r.worstUtil < 0.95 ? '要注意' : '危険';
    const loadTone = r.worstUtil < 0.6 ? 'good' : r.worstUtil < 0.95 ? 'warn' : 'bad';
    document.getElementById('db-overview').innerHTML = `
      <article class="overview-card overview-growth">
        <span><i class="fa-solid fa-user-plus"></i>本日の純増</span>
        <strong class="${netGrowth >= 0 ? 'good' : 'bad'}">${netGrowth >= 0 ? '+' : ''}${this.num(netGrowth)}<small>人</small></strong>
        <p>登録 ${this.num(s.users)}人</p>
      </article>
      <article class="overview-card overview-profit">
        <span><i class="fa-solid fa-coins"></i>日次損益</span>
        <strong class="${r.profit >= 0 ? 'good' : 'bad'}">${r.profit >= 0 ? '+' : ''}${this.yen(r.profit)}</strong>
        <p>資金 ${this.yen(s.cash)}</p>
      </article>
      <article class="overview-card overview-health">
        <span><i class="fa-solid fa-face-smile"></i>満足度</span>
        <strong class="${s.satisfaction >= 60 ? 'good' : s.satisfaction >= 45 ? 'warn' : 'bad'}">${s.satisfaction.toFixed(1)}<small>/100</small></strong>
        <p>信頼度 ${s.trust.toFixed(1)}</p>
      </article>
      <article class="overview-card overview-load">
        <span><i class="fa-solid fa-server"></i>最大負荷</span>
        <strong class="${loadTone}">${Math.round(r.worstUtil * 100)}<small>%</small></strong>
        <p class="${loadTone}">${loadStatus}${r.outage ? '・障害発生中' : ''}</p>
      </article>`;
    document.getElementById('db-social').innerHTML = `
      <div class="pulse-stat"><span>今日来た人</span><strong>${this.num(r.dau)}</strong><small>DAU ${(r.activeRatio*100).toFixed(1)}%</small></div>
      <div class="pulse-stat"><span>見る中心</span><strong>${this.num(r.readers)}</strong><small>DAUの${Math.round(r.readers/Math.max(r.dau,1)*100)}%</small></div>
      <div class="pulse-stat"><span>投稿・返信する人</span><strong>${this.num(r.contributors)}</strong><small>コア発信者 ${this.num(r.creators)}人</small></div>
      <div class="pulse-stat"><span>投稿 / 返信</span><strong>${this.num(r.originalPosts)} / ${this.num(r.replies)}</strong><small>人による会話</small></div>
      <div class="pulse-stat"><span>リアクション</span><strong>${this.num(r.reactions)}</strong><small>シェア ${this.num(r.shares)}件</small></div>`;
    document.getElementById('db-users').innerHTML = `
      <div class="stat-row"><span class="lbl">登録ユーザー</span><span class="val">${this.num(s.users)}人</span></div>
      <div class="stat-row"><span class="lbl">DAU（日次アクティブ）</span><span class="val">${this.num(r.dau)}人（${(r.activeRatio*100).toFixed(1)}%）</span></div>
      <div class="stat-row"><span class="lbl">本日の純増見込み</span><span class="val ${netGrowth>=0?'good':'bad'}">${netGrowth>=0?'+':''}${this.num(netGrowth)}人</span></div>
      <div class="stat-row"><span class="lbl">└ 自然流入 / 広告流入</span><span class="val">+${this.num(r.organicIn)} / +${this.num(r.promoIn)}</span></div>
      <div class="stat-row"><span class="lbl">└ 離脱 / 誤BAN起因</span><span class="val bad">-${this.num(r.churnOut)} / -${this.num(r.wrongBanOut)}</span></div>
      <div class="stat-row"><span class="lbl">└ 競合から流入 / 競合へ流出</span><span class="val ${r.competitorInflow>=r.competitorOutflow?'good':'bad'}">+${this.num(r.competitorInflow)} / -${this.num(r.competitorOutflow)}</span></div>
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
    document.getElementById('db-trends').innerHTML = s.trends.slice(0, 5).map((trend, index) => `
      <div class="trend-row">
        <span class="trend-rank">${index + 1}</span>
        <div><b>${this.esc(trend.tag)}</b><small>${trend.category} · ${this.num(trend.volume)}件</small></div>
        <span class="trend-change ${trend.change >= 0 ? 'up' : 'down'}">${trend.change >= 0 ? '▲' : '▼'} ${Math.abs(trend.change)}</span>
      </div>`).join('');
    document.getElementById('db-segments').innerHTML = r.segmentMetrics.map(segment => `
      <div class="segment-row">
        <span class="segment-icon" style="--segment-color:${segment.color}"><i class="fa-solid ${segment.icon}"></i></span>
        <div><b>${segment.name}</b><small>${this.num(segment.users)}人 · DAU ${this.num(segment.dau)}</small></div>
        <span class="segment-score ${segment.affinity >= 65 ? 'good' : segment.affinity >= 48 ? 'warn' : 'bad'}">${Math.round(segment.affinity)}</span>
      </div>`).join('');
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

  // ---------- 成長戦略 ----------
  renderStrategy(el, s, r) {
    const completed = id => s.research.completed.includes(id);
    const activeResearch = s.research.active && CONFIG.RESEARCH.find(item => item.id === s.research.active.id);
    const researchCards = CONFIG.RESEARCH.map(item => {
      const done = completed(item.id);
      const active = s.research.active?.id === item.id;
      const missing = (item.requires || []).filter(id => !completed(id));
      const requirement = missing.map(id => CONFIG.RESEARCH.find(project => project.id === id)?.name).filter(Boolean).join('、');
      return `<div class="strategy-card research-node ${done ? 'completed' : active ? 'active' : missing.length ? 'locked' : ''}">
        <div class="strategy-icon"><i class="fa-solid ${item.icon}"></i></div>
        <div class="strategy-body"><b>${item.name}</b><p>${item.desc}</p><small>${this.yen(item.cost)} · 研究${item.days}日${requirement ? ` · 前提: ${requirement}` : ''}</small></div>
        ${done ? '<span class="status-chip done">完了</span>' : active ? `<span class="status-chip active">残り${s.research.active.daysLeft}日</span>` : `<button class="btn-sm" onclick="Game.startResearch('${item.id}')" ${s.research.active || missing.length || s.cash < item.cost ? 'disabled' : ''}>研究開始</button>`}
      </div>`;
    }).join('');

    const pendingDc = key => s.dcProjects.filter(project => project.key === key);
    const dcCards = Object.entries(CONFIG.DATA_CENTERS).map(([key, facility]) => {
      const projects = pendingDc(key);
      return `<div class="strategy-card facility-card ${!completed('dcPlanning') ? 'locked' : ''}">
        <div class="strategy-icon"><i class="fa-solid ${facility.icon}"></i></div>
        <div class="strategy-body"><b>${facility.name}</b><p>${facility.desc}</p>
          <small>${this.yen(facility.price)} · 工期${facility.days}日 · 維持${this.yen(facility.upkeep)}/日</small>
          <span class="effect-line">Web ${this.num(facility.web)} req/s / DB ${this.num(facility.db)} q/s / 回線 ${facility.bandwidth}Gbps${facility.gpu ? ` / GPU ${facility.gpu}` : ''}</span>
        </div>
        <div class="strategy-action"><strong>${s.dataCenters[key] || 0}拠点</strong>${projects.map(project => `<small>建設中 残り${project.daysLeft}日</small>`).join('')}<button class="btn-sm" onclick="Game.buildDataCenter('${key}')" ${!completed('dcPlanning') || s.cash < facility.price ? 'disabled' : ''}>建設</button></div>
      </div>`;
    }).join('');

    const marketCards = Object.entries(CONFIG.MARKETS).map(([key, market]) => {
      const opened = Boolean(s.markets[key]);
      const featureLive = Boolean(s.markets[key]?.feature);
      return `<div class="strategy-card market-card ${opened ? 'completed' : !completed('globalOps') ? 'locked' : ''}">
        <div class="strategy-icon"><i class="fa-solid ${market.icon}"></i></div>
        <div class="strategy-body"><b>${market.name}</b><p>${market.desc}</p><small>初期${this.yen(market.entry)} · 継続${this.yen(market.upkeep)}/日</small>
          <span class="effect-line">成長 ×${market.growth.toFixed(2)} / 広告単価 ×${market.ecpm.toFixed(2)} / インフラ需要 ${market.infraNeed.toFixed(1)}</span>
          <span class="local-feature"><i class="fa-solid fa-location-dot"></i> 限定: ${market.feature} — ${market.featureEffect}</span>
        </div>
        <div class="strategy-action">${opened ? (featureLive ? '<span class="status-chip done">限定機能 公開中</span>' : `<span class="status-chip active">展開中</span><button class="btn-sm" onclick="Game.launchMarketFeature('${key}')" ${s.cash < market.featureCost ? 'disabled' : ''}>限定機能 ${this.yen(market.featureCost)}</button>`) : `<button class="btn-sm" onclick="Game.enterMarket('${key}')" ${!completed('globalOps') || s.cash < market.entry ? 'disabled' : ''}>進出</button>`}</div>
      </div>`;
    }).join('');

    const eventData = s.overseasEvent && CONFIG.OVERSEAS_EVENTS.find(item => item.id === s.overseasEvent.eventId);
    const overseasEvent = eventData ? `<div class="overseas-event">
      <div class="event-head"><span><i class="fa-solid ${eventData.icon}"></i></span><div><small>${CONFIG.MARKETS[s.overseasEvent.marketId].name} · Day ${s.overseasEvent.day}</small><b>${eventData.name}</b></div></div>
      <p>${eventData.desc}</p>
      <div class="event-choices">${eventData.choices.map(choice => `<button onclick="Game.resolveOverseasEvent('${choice.id}')" ${s.cash < choice.cost ? 'disabled' : ''}><b>${choice.name}</b><span>${choice.cost ? this.yen(choice.cost) : '無料'} · ユーザー ${choice.users >= 0 ? '+' : ''}${this.num(choice.users)} · 信頼 ${choice.trust >= 0 ? '+' : ''}${choice.trust}</span><small>${choice.desc}</small></button>`).join('')}</div>
    </div>` : (r.activeMarkets.length ? '<div class="quiet-state">現在、対応が必要な海外イベントはありません。</div>' : '');

    const acquisitionCards = CONFIG.ACQUISITIONS.map(company => {
      const owned = s.acquisitions.includes(company.id);
      return `<div class="strategy-card acquisition-card ${owned ? 'completed' : !completed('maTeam') ? 'locked' : ''}">
        <div class="strategy-icon"><i class="fa-solid ${company.icon}"></i></div>
        <div class="strategy-body"><b>${company.name}</b><p>${company.desc}</p><small>${this.yen(company.price)} · 統合費${this.yen(company.upkeep)}/日</small><span class="effect-line">${company.effect}</span></div>
        ${owned ? '<span class="status-chip done">買収済み</span>' : `<button class="btn-sm" onclick="Game.acquireCompany('${company.id}')" ${!completed('maTeam') || s.cash < company.price ? 'disabled' : ''}>買収</button>`}
      </div>`;
    }).join('');

    const shareCopy = {
      0:'利益最大。ただし有力クリエイターが競合へ流出します。',
      10:'標準的な還元。収益性と定着のバランス型です。',
      20:'投稿とバズが増加し、コミュニティの成長が加速します。',
      30:'強い囲い込み。成長力は最大ですが利益率が大幅に低下します。',
    }[s.creatorShare];

    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-diagram-project"></i>成長戦略・研究開発</h2>
      <div class="strategy-summary card">
        <div><span>研究</span><b>${s.research.completed.length} / ${CONFIG.RESEARCH.length}</b><small>${activeResearch ? `${activeResearch.name} 残り${s.research.active.daysLeft}日` : '研究枠は空いています'}</small></div>
        <div><span>データセンター</span><b>${Object.values(s.dataCenters).reduce((a, b) => a + b, 0)}拠点</b><small>建設中 ${s.dcProjects.length}件</small></div>
        <div><span>海外市場</span><b>${r.activeMarkets.length}地域</b><small>現地費 ${this.yen(r.marketCost)}/日</small></div>
        <div><span>戦略固定費</span><b class="bad">${this.yen(r.dcCost + r.marketCost + r.acquisitionCost)}/日</b><small>買収・設備・海外運営</small></div>
      </div>

      <div class="card"><h3><i class="fa-solid fa-flask"></i>研究開発ツリー</h3><p class="desc strategy-intro">研究は同時に1件。費用を先払いし、所定の日数が経過すると新しい経営手段が解禁されます。</p><div class="strategy-list research-list">${researchCards}</div></div>
      <div class="card"><h3><i class="fa-solid fa-building"></i>データセンター建設</h3><p class="desc strategy-intro">完成まで10〜30日。稼働後は電力・人員・保守費が毎日発生します。先行投資と障害リスクを見極めてください。</p><div class="strategy-list">${dcCards}</div></div>
      <div class="card"><h3><i class="fa-solid fa-globe"></i>海外展開・地域限定機能</h3><p class="desc strategy-intro">市場を増やすほど翻訳・サポート・法務・サーバー費が増加。進出後は地域限定機能を公開でき、現地イベントが発生します。</p><div class="strategy-list">${marketCards}</div>${r.activeMarkets.length ? `<div class="global-risk ${r.globalInfraPenalty > 0.4 ? 'danger' : ''}"><span>海外インフラ不足度</span><b>${Math.round(r.globalInfraPenalty * 100)}%</b><small>成長効果 ×${r.marketGrowthFactor.toFixed(2)} / 広告単価効果 ×${r.marketEcpmFactor.toFixed(2)}</small></div><h3 class="event-title"><i class="fa-solid fa-calendar-star"></i>海外限定イベント</h3>${overseasEvent}` : ''}</div>
      <div class="card ${!completed('creatorEconomy') ? 'locked-panel' : ''}"><h3><i class="fa-solid fa-coins"></i>クリエイター収益分配</h3>
        <div class="share-display"><strong>${s.creatorShare}%</strong><div><b>広告収益から本日 ${this.yen(r.creatorPayout)} を還元</b><p>${shareCopy}</p></div></div>
        <input type="range" min="0" max="30" step="10" value="${s.creatorShare}" oninput="Game.setCreatorShare(+this.value)" ${!completed('creatorEconomy') ? 'disabled' : ''}>
        <div class="range-labels"><span>0% 利益優先</span><span>10% 標準</span><span>20% 投稿増</span><span>30% 囲い込み</span></div>
        ${!completed('creatorEconomy') ? '<p class="locked-note"><i class="fa-solid fa-lock"></i>「クリエイター経済圏」の研究で解禁</p>' : ''}
      </div>
      <div class="card"><h3><i class="fa-solid fa-handshake"></i>買収候補</h3><p class="desc strategy-intro">大手競合は買収できません。専門技術や小規模コミュニティを持つ企業を統合できます。</p><div class="strategy-list acquisition-list">${acquisitionCards}</div></div>`;
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
        <div class="stat-row"><span class="lbl">人による投稿・返信</span><span class="val">${this.num(r.humanPosts)}件/日</span></div>
        <div class="stat-row"><span class="lbl">BOT投稿</span><span class="val ${r.botPosts/r.posts>0.15?'bad':'warn'}">${this.num(r.botPosts)}件/日</span></div>
        <div class="stat-row"><span class="lbl">審査対象合計</span><span class="val">${this.num(r.posts)}件/日</span></div>
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
      body = `<div class="card"><div class="no-incident"><i class="fa-solid fa-dove"></i>大きな炎上は発生していません。<br><span class="desc">日常的な賛否や小さな批判は通常の会話として推移します。問題が一定規模を超えた場合のみ対応案件になります。</span></div></div>`;
    } else {
      body = s.incidents.map(inc => {
        const respBtns = CONFIG.RESPONSES.map(resp => {
          const cost = resp.cost ?? (resp.costBase + resp.costPerSev * inc.sev);
          const prob = Math.max(0.05, Math.min(0.97, resp.base + s.staff.pr * 0.04 + (s.trust - 50) * 0.003 + (resp.id === 'silence' && inc.sev <= 1 ? resp.smallBonus : 0)));
          return `<button class="resp-btn" onclick="Game.respondIncident(${inc.uid},'${resp.id}')" ${(inc.responseCooldown || 0) > 0 ? 'disabled' : ''}>
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
          <div class="gauge-head"><span>炎上ヒート(発生${inc.age}日目・${this.esc(inc.phase || '拡大中')})</span><span class="g-val">${Math.round(inc.heat)} / 150</span></div>
          <div class="heat-bar"><div class="heat-fill" style="width:${Math.min(100, inc.heat / 150 * 100)}%"></div></div>
          <p class="desc">最短でも約${inc.minDays || CONFIG.INCIDENT_MIN_DAYS[inc.sev]}日間は余波が残ります。${(inc.responseCooldown || 0) > 0 ? `対応効果を検証中（次の施策まで${inc.responseCooldown}日）` : '新しい対応策を実行できます。'}</p>
          <div class="resp-grid">${respBtns}</div>
        </div>`;
      }).join('');
    }
    const buzzBody = s.buzzPosts.length ? s.buzzPosts.map(buzz => `
      <div class="buzz-card ${buzz.sentiment}">
        <div class="buzz-top"><span class="live-dot"></span><b>急上昇中</b><span>発生${buzz.age}日目</span></div>
        <div class="buzz-author">${this.esc(buzz.author)} <span>· ${this.esc(buzz.tag)}</span></div>
        <p>${this.esc(buzz.text)}</p>
        <div class="buzz-metrics">
          <span><i class="fa-solid fa-eye"></i>${this.num(buzz.reach)}</span>
          <span><i class="fa-solid fa-retweet"></i>${this.num(buzz.reposts)}</span>
          <span><i class="fa-solid fa-heart"></i>${this.num(buzz.likes)}</span>
          <span>拡散速度 ×${buzz.velocity.toFixed(2)}</span>
        </div>
        <div class="buzz-actions">
          ${buzz.sentiment !== 'negative' ? `<button class="btn-sm" onclick="Game.manageBuzz(${buzz.uid},'boost')" ${buzz.managed?'disabled':''}>公式で紹介 ${this.yen(500000)}</button>` : ''}
          <button class="btn-sm" onclick="Game.manageBuzz(${buzz.uid},'explain')" ${buzz.managed?'disabled':''}>背景説明を追加 ${this.yen(300000)}</button>
        </div>
      </div>`).join('') : '<div class="quiet-state">現在、急上昇中のバズ投稿はありません。</div>';

    const requestBody = s.userRequests.map(request => `
      <div class="request-card ${request.implemented ? 'done' : ''}">
        <div class="request-head"><div><span>${CONFIG.USER_SEGMENTS.find(segment => segment.id === request.segment)?.name || '全ユーザー'}</span><b>${request.title}</b></div><strong>${Math.round(request.support)}%</strong></div>
        <p>${request.desc}</p>
        <div class="request-progress"><i style="width:${request.support}%"></i></div>
        <div class="request-foot"><span>${this.num(request.votes)}票</span><div>
          ${request.implemented ? '<span class="implemented-tag"><i class="fa-solid fa-check"></i> 実装済み</span>' : `<button class="btn-sm" onclick="Game.surveyRequest('${request.id}')" ${s.cash < 100000 ? 'disabled' : ''}>アンケート ${this.yen(100000)}</button><button class="btn-sm" onclick="Game.implementRequest('${request.id}')" ${s.cash < request.cost ? 'disabled' : ''}>実装 ${this.yen(request.cost)}</button>`}
        </div></div>
      </div>`).join('');

    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-fire"></i>世論・炎上対応</h2>
      <div class="crisis-subnav"><span><i class="fa-solid fa-fire"></i> 炎上案件 ${s.incidents.length}</span><span><i class="fa-solid fa-bolt"></i> バズ ${s.buzzPosts.length}</span><span><i class="fa-solid fa-square-poll-vertical"></i> 要望 ${s.userRequests.filter(item => !item.implemented).length}</span></div>
      ${body}
      <div class="card"><h3><i class="fa-solid fa-bolt"></i>バズ投稿・拡散モニター</h3><div class="buzz-list">${buzzBody}</div></div>
      <div class="card"><h3><i class="fa-solid fa-square-poll-vertical"></i>ユーザー要望・アンケート</h3><p class="desc request-intro">支持率を調査してから実装すると、どの層が求めているか判断できます。</p><div class="request-grid">${requestBody}</div></div>
      <div class="card">
        <h3><i class="fa-solid fa-bullhorn"></i>広報(PR)スタッフ: ${s.staff.pr}人 <span class="desc">(対応成功率+4%/人・日々の収束を補助・${this.yen(CONFIG.STAFF.pr.cost)}/日)</span></h3>
        <div class="staff-btns" style="justify-content:flex-start">
          <button onclick="Game.hire('pr',-1)" ${s.staff.pr <= 0 ? 'disabled' : ''}>−</button>
          <span class="staff-count">${s.staff.pr}</span>
          <button onclick="Game.hire('pr',1)" ${s.staff.pr >= CONFIG.STAFF.pr.max ? 'disabled' : ''}>+</button>
        </div>
        <p class="desc">炎上は初動から数日かけてピークを迎え、原因が残る限り再燃します。対応成功は即時鎮火ではなく、ヒート低下とその後の収束を早めます。重大案件ほど数週間の余波が残ります。</p>
      </div>`;
  },

  // ---------- 競合SNS ----------
  renderCompetitors(el, s, r) {
    const totalMarket = s.users + s.competitors.reduce((sum, competitor) => sum + competitor.users, 0);
    const chirperShare = s.users / totalMarket * 100;
    const campaignData = [
      { id:'youth', name:'学生アンバサダー企画', cost:1500000, target:'Loop', icon:'fa-graduation-cap' },
      { id:'creator', name:'クリエイター支援', cost:2500000, target:'Echo', icon:'fa-palette' },
      { id:'business', name:'企業認証キャンペーン', cost:2200000, target:'LinkUp', icon:'fa-briefcase' },
    ];
    const competitors = s.competitors.map(competitor => {
      const share = competitor.users / totalMarket * 100;
      return `<div class="competitor-card">
        <div class="competitor-brand"><span style="--competitor-color:${competitor.color}"><i class="fa-solid ${competitor.icon}"></i></span><div><b>${competitor.name}</b><small>${competitor.focus}</small></div></div>
        <div class="competitor-stats"><div><span>ユーザー</span><b>${this.num(competitor.users)}</b></div><div><span>市場シェア</span><b>${share.toFixed(1)}%</b></div><div><span>魅力度</span><b>${competitor.appeal.toFixed(1)}</b></div></div>
        <div class="market-bar"><i style="width:${share}%"></i></div>
        <div class="competitor-change ${competitor.dailyChange >= 0 ? 'up' : 'down'}">前日比 ${competitor.dailyChange >= 0 ? '+' : ''}${this.num(competitor.dailyChange)}人</div>
      </div>`;
    }).join('');
    const campaigns = campaignData.map(campaign => {
      const days = s.campaigns[campaign.id] || 0;
      return `<div class="campaign-row"><span class="campaign-icon"><i class="fa-solid ${campaign.icon}"></i></span><div><b>${campaign.name}</b><small>${campaign.target}への流出を10日間抑制</small></div>${days ? `<span class="campaign-active">残り${days}日</span>` : `<button class="btn-sm" onclick="Game.launchCampaign('${campaign.id}')" ${s.cash < campaign.cost ? 'disabled' : ''}>開始 ${this.yen(campaign.cost)}</button>`}</div>`;
    }).join('');
    el.innerHTML = `
      <h2 class="section-title"><i class="fa-solid fa-people-arrows"></i>競合SNS市場</h2>
      <div class="market-hero card">
        <div><span class="eyebrow">SOCIAL MARKET</span><h3>Chirper 市場シェア</h3><strong>${chirperShare.toFixed(1)}%</strong></div>
        <div class="market-summary"><div><span>Chirperユーザー</span><b>${this.num(s.users)}</b></div><div><span>サービス魅力度</span><b>${r.ownAppeal.toFixed(1)}</b></div><div><span>競合からの流入</span><b class="good">+${this.num(r.competitorInflow)}/日</b></div><div><span>競合への流出</span><b class="bad">-${this.num(r.competitorOutflow)}/日</b></div></div>
      </div>
      <div class="competitor-grid">${competitors}</div>
      <div class="card"><h3><i class="fa-solid fa-bullseye"></i>対抗キャンペーン</h3><div class="campaign-list">${campaigns}</div></div>`;
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
            <tr><td>データセンター維持費</td><td>-${this.yen(r.dcCost)}</td></tr>
            <tr><td>海外市場運営費</td><td>-${this.yen(r.marketCost)}</td></tr>
            <tr><td>買収企業の統合・運営費</td><td>-${this.yen(r.acquisitionCost)}</td></tr>
            <tr><td>クリエイター収益分配 (${s.creatorShare}%)</td><td>-${this.yen(r.creatorPayout)}</td></tr>
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
