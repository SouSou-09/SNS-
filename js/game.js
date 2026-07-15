// ============================================================
// SNS経営シミュレーター コアロジック
// ============================================================
'use strict';

const Game = {
  state: null,
  timer: null,
  speed: 1,
  paused: true,
  saveKey: 'chirper-tycoon-save-v1',

  // ---------------- セーブデータ ----------------
  hasSave() {
    try {
      return localStorage.getItem(this.saveKey) !== null;
    } catch (_) {
      return false;
    }
  },

  saveGame() {
    if (!this.state) return false;
    try {
      localStorage.setItem(this.saveKey, JSON.stringify({ version: 1, state: this.state }));
      return true;
    } catch (_) {
      return false;
    }
  },

  loadGame() {
    const previousState = this.state;
    try {
      const data = JSON.parse(localStorage.getItem(this.saveKey));
      if (data?.version !== 1 || !data.state || !Number.isFinite(data.state.day)
          || !Number.isFinite(data.state.cash) || !Number.isFinite(data.state.users)) {
        throw new Error('Invalid save data');
      }
      this.pause();
      this.state = data.state;
      this.state.gameOver = Boolean(this.state.gameOver);
      this.state.won = Boolean(this.state.won);
      this.computeReport();
      return true;
    } catch (_) {
      this.state = previousState;
      try { localStorage.removeItem(this.saveKey); } catch (_) { /* storage unavailable */ }
      return false;
    }
  },

  // ---------------- 初期化 ----------------
  newGame() {
    this.state = {
      day: 1,
      cash: CONFIG.START_CASH,
      users: CONFIG.START_USERS,
      bots: CONFIG.START_BOTS,
      satisfaction: 62,        // ユーザー満足度 0-100
      trust: 50,               // 企業信頼度 0-100
      premiumRate: 0.004,      // プレミアム加入率
      storageUsedTB: 12,       // 使用済みストレージ
      // 保有サーバー { key: 台数 }
      servers: { web_s: 4, db_s: 2, cache: 1, gpu: 0, storage: 1 },
      pendingOrders: [],       // { key, count, daysLeft }
      cdnUnits: 1,
      autoScale: false,
      staff: { engineer: 1, mod: 2, pr: 0, adSales: 0, reportTeam: 0 },
      aiModTier: 0,
      botAiTier: 0,
      captcha: false,
      smsVerify: false,
      adLoad: 8,               // 広告表示率 %
      adQuality: 1,            // 0=低審査 1=標準 2=厳格
      promoBudget: 0,          // マーケ予算 ¥/日
      incidents: [],           // アクティブ炎上
      incidentSeq: 0,
      outageDays: 0,
      log: [],
      history: { users: [], cash: [], profit: [], satisfaction: [], load: [] },
      milestonesHit: [],
      gameOver: false,
      won: false,
      totalProfit: 0,
      lastReport: null,
      graceUsed: false,
    };
    this.log('🎉 SNS「Chirper」サービス開始!初期ユーザー5万人、資金¥5,000万からのスタートです。', 'good');
    this.computeReport();
  },

  log(msg, type = 'info') {
    this.state.log.unshift({ day: this.state.day, msg, type });
    if (this.state.log.length > 120) this.state.log.pop();
  },

  // ---------------- キャパシティ計算 ----------------
  capacity() {
    const s = this.state, S = CONFIG.SERVERS;
    const engBonus = 1 + 0.02 * s.staff.engineer;
    const cnt = k => s.servers[k] || 0;
    return {
      webReq: (cnt('web_s') * S.web_s.cap + cnt('web_m') * S.web_m.cap + cnt('web_l') * S.web_l.cap) * engBonus,
      dbQuery: (cnt('db_s') * S.db_s.cap + cnt('db_m') * S.db_m.cap + cnt('db_l') * S.db_l.cap) * engBonus,
      cacheQuery: cnt('cache') * S.cache.cap * engBonus,
      gpuUnits: cnt('gpu') * S.gpu.cap,
      storageTB: cnt('storage') * S.storage.cap,
      bandwidthGbps: s.cdnUnits * CONFIG.CDN_UNIT_GBPS,
    };
  },

  // GPU割当:モデレーションAI優先→BOT検知
  gpuDemand() {
    const s = this.state;
    const modTier = CONFIG.AI_TIERS[s.aiModTier];
    const botTier = CONFIG.BOT_AI_TIERS[s.botAiTier];
    const dau = s.users * CONFIG.DAU_RATIO;
    const posts = dau * CONFIG.POSTS_PER_DAU + s.bots * 15; // BOTも投稿
    const modNeed = modTier.gpuPer > 0 ? posts / modTier.gpuPer : 0;
    const botNeed = botTier.gpuPer > 0 ? s.bots / botTier.gpuPer : 0;
    return { modNeed, botNeed, total: modNeed + botNeed };
  },

  // ---------------- 日次レポート計算(現在状態から) ----------------
  computeReport() {
    const s = this.state, cap = this.capacity();
    const dau = s.users * CONFIG.DAU_RATIO;
    const effectiveActors = dau + s.bots * CONFIG.BOT_LOAD_FACTOR;

    // --- 負荷 ---
    const peakReqPerSec = effectiveActors * CONFIG.ACTIONS_PER_DAU / 86400 * CONFIG.PEAK_FACTOR;
    const rawQueryPerSec = peakReqPerSec * CONFIG.DB_QUERY_PER_REQ;
    const cacheable = rawQueryPerSec * CONFIG.CACHEABLE_RATIO;
    const cacheHit = Math.min(cacheable, cap.cacheQuery);
    const dbQueryPerSec = rawQueryPerSec - cacheHit;
    const peakGbps = peakReqPerSec * CONFIG.MB_PER_REQ * 8 / 1000;

    // --- 稼働率と不足分 ---
    const shortWeb = Math.max(0, peakReqPerSec - cap.webReq);
    const shortDb = Math.max(0, dbQueryPerSec - cap.dbQuery);
    const shortBw = Math.max(0, peakGbps - cap.bandwidthGbps);

    let autoScaleCost = 0;
    let effShortWeb = shortWeb, effShortDb = shortDb, effShortBw = shortBw;
    if (s.autoScale) {
      autoScaleCost = shortWeb * CONFIG.AUTOSCALE.webCostPerReq
                    + shortDb * CONFIG.AUTOSCALE.dbCostPerQuery
                    + shortBw * CONFIG.AUTOSCALE.bwCostPerGbps;
      effShortWeb = effShortDb = effShortBw = 0;
    }

    const util = (used, capa) => capa > 0 ? used / capa : (used > 0 ? 2 : 0);
    const webUtil = s.autoScale ? Math.min(1, util(peakReqPerSec, cap.webReq)) : util(peakReqPerSec, cap.webReq);
    const dbUtil = s.autoScale ? Math.min(1, util(dbQueryPerSec, cap.dbQuery)) : util(dbQueryPerSec, cap.dbQuery);
    const bwUtil = s.autoScale ? Math.min(1, util(peakGbps, cap.bandwidthGbps)) : util(peakGbps, cap.bandwidthGbps);
    const storageUtil = util(s.storageUsedTB, cap.storageTB);
    const worstUtil = Math.max(webUtil, dbUtil, bwUtil);

    // --- レイテンシモデル(M/M/1近似) ---
    let latency = CONFIG.BASE_LATENCY;
    const congestion = u => u < 0.6 ? 0 : u < 1 ? Math.pow((u - 0.6) / 0.4, 2) : 1;
    latency += 400 * congestion(webUtil) + 500 * congestion(dbUtil) + 250 * congestion(bwUtil);
    if (cacheHit > 0) latency -= 15;
    latency = Math.max(40, latency);

    // 障害判定(稼働率100%超過分に応じてエラー率上昇)
    const overload = Math.max(effShortWeb / Math.max(cap.webReq, 1), effShortDb / Math.max(cap.dbQuery, 1), effShortBw / Math.max(cap.bandwidthGbps, 1));
    const errorRate = Math.min(0.9, overload * 1.2);
    const outage = errorRate > 0.35;

    // --- モデレーション ---
    const posts = dau * CONFIG.POSTS_PER_DAU + s.bots * 15;
    const modTier = CONFIG.AI_TIERS[s.aiModTier];
    const gpu = this.gpuDemand();
    // GPU不足なら性能減衰(モデレーション優先割当)
    const gpuForMod = Math.min(gpu.modNeed, cap.gpuUnits);
    const modAiCover = gpu.modNeed > 0 ? gpuForMod / gpu.modNeed : 1;
    const aiDetect = modTier.detect * (modTier.gpuPer > 0 ? modAiCover : 1);

    const toxicRate = CONFIG.TOXIC_BASE_RATE * (1 + s.bots / Math.max(s.users, 1) * 3);
    const toxicPosts = posts * toxicRate;
    const aiCaught = toxicPosts * aiDetect;
    const humanCap = s.staff.mod * CONFIG.MOD_CAP_PER_HUMAN;
    const humanCaught = Math.min(toxicPosts - aiCaught, humanCap) * 0.95;
    const toxicVisible = Math.max(0, toxicPosts - aiCaught - Math.max(0, humanCaught));
    const toxicExposure = toxicVisible / Math.max(posts, 1); // フィード汚染率
    const falseBans = posts * modTier.fp * (modTier.gpuPer > 0 ? modAiCover : 1) * 0.001; // 誤BANアカウント数/日

    // --- BOT ---
    const gpuForBot = Math.max(0, Math.min(gpu.botNeed, cap.gpuUnits - gpuForMod));
    const botAiCover = gpu.botNeed > 0 ? gpuForBot / gpu.botNeed : 1;
    const botTier = CONFIG.BOT_AI_TIERS[s.botAiTier];
    const botBanAi = s.bots * botTier.banRate * (botTier.gpuPer > 0 ? botAiCover : 1);
    const botBanReport = Math.min(s.bots * 0.25, s.staff.reportTeam * CONFIG.REPORT_BAN_PER_STAFF);
    // BOT流入:ユーザー数と広告収益性に比例して増える
    let botInflowRate = 0.00012 + s.adLoad * 0.000004;
    let signupBlock = 0, convPenalty = 0;
    if (s.captcha) { signupBlock += CONFIG.CAPTCHA.block; convPenalty += CONFIG.CAPTCHA.convPenalty; }
    if (s.smsVerify) { signupBlock += (1 - signupBlock) * CONFIG.SMS.block; convPenalty += CONFIG.SMS.convPenalty; }
    const botInflow = s.users * botInflowRate * (1 - signupBlock);
    const botRatio = s.bots / Math.max(s.users + s.bots, 1);

    // --- 満足度への影響を集計 ---
    let satDelta = 0;
    satDelta += (150 - latency) / 150 * 1.2;            // 速さ
    satDelta -= errorRate * 25;                          // エラー
    satDelta -= toxicExposure * 50;                      // 有害投稿
    satDelta -= botRatio * 12;                           // BOT遭遇
    satDelta -= Math.max(0, s.adLoad - 10) * 0.10;       // 広告過多
    if (s.adQuality === 0) satDelta -= 0.5;
    if (s.smsVerify) satDelta -= 0.1;
    satDelta -= s.incidents.reduce((a, i) => a + i.heat / 180, 0); // 炎上中
    if (storageUtil > 0.95) satDelta -= 1.5;             // 容量逼迫(アップロード失敗)
    satDelta += (s.trust - 50) * 0.01;
    // 満足度は現在値に応じて収束(高いほど上げにくい)
    satDelta -= (s.satisfaction - 60) * 0.035;

    // --- 収益 ---
    const impressions = dau * CONFIG.FEED_VIEWS_PER_DAU * (s.adLoad / 100);
    let ecpm = CONFIG.BASE_ECPM;
    ecpm *= 1 + Math.min(0.45, s.staff.adSales * 0.03);
    ecpm *= [1.25, 1.0, 0.85][2 - s.adQuality];          // 低審査ほど単価は高い
    ecpm *= 0.5 + s.satisfaction / 100 * 0.8;            // 満足度でエンゲージ変動
    ecpm *= 0.6 + s.trust / 100 * 0.8;                   // ブランドセーフティ
    ecpm *= Math.max(0.3, 1 - botRatio * 2.5);           // BOT impは広告主が値引き要求
    if (outage) ecpm *= 0.6;
    const adRevenue = impressions / 1000 * ecpm;
    const premiumRevenue = s.users * s.premiumRate * CONFIG.PREMIUM_PRICE / 30;
    const revenue = adRevenue + premiumRevenue;

    // --- 費用 ---
    let upkeep = 0;
    for (const k in s.servers) upkeep += s.servers[k] * CONFIG.SERVERS[k].upkeep;
    const cdnCost = s.cdnUnits * CONFIG.CDN_UNIT_COST;
    let staffCost = 0;
    for (const k in s.staff) staffCost += s.staff[k] * CONFIG.STAFF[k].cost;
    let securityCost = 0;
    if (s.captcha) securityCost += CONFIG.CAPTCHA.cost;
    if (s.smsVerify) securityCost += CONFIG.SMS.cost;
    const licenseCost = modTier.license + botTier.license;
    const promoCost = s.promoBudget;
    const cost = upkeep + cdnCost + staffCost + securityCost + licenseCost + promoCost + autoScaleCost + CONFIG.OFFICE_BASE_COST;
    const profit = revenue - cost;

    // --- 成長 ---
    const satFactor = (s.satisfaction - 45) / 55;        // 45未満で負成長圧
    const organicIn = s.users * CONFIG.VIRAL_COEF * Math.max(0, satFactor) * (1 - convPenalty) * (0.7 + s.trust / 100 * 0.6);
    const cpa = CONFIG.PROMO_CPA_BASE * (1 + Math.max(0, 1 - s.satisfaction / 100));
    const promoIn = s.promoBudget / cpa * (1 - convPenalty);
    let churnRate = CONFIG.BASE_CHURN;
    churnRate += Math.max(0, 55 - s.satisfaction) * 0.0006;
    churnRate += errorRate * 0.02;
    churnRate += toxicExposure * 0.10;
    churnRate += botRatio * 0.015;
    churnRate += s.incidents.reduce((a, i) => a + i.heat * 0.00004, 0);
    const churnOut = s.users * churnRate;
    const wrongBanOut = falseBans * 40; // 誤BAN 1件が波及して周辺ユーザー離脱

    return {
      dau, peakReqPerSec, dbQueryPerSec, rawQueryPerSec, cacheHit, peakGbps,
      webUtil, dbUtil, bwUtil, storageUtil, worstUtil, latency, errorRate, outage,
      posts, toxicPosts, aiCaught, humanCaught: Math.max(0, humanCaught), toxicVisible, toxicExposure,
      aiDetect, modAiCover, falseBans, humanCap,
      botBanAi, botBanReport, botInflow, botRatio, botAiCover, signupBlock, convPenalty,
      impressions, ecpm, adRevenue, premiumRevenue, revenue,
      upkeep, cdnCost, staffCost, securityCost, licenseCost, promoCost, autoScaleCost,
      officeCost: CONFIG.OFFICE_BASE_COST, cost, profit,
      organicIn, promoIn, churnOut, wrongBanOut, churnRate, satDelta,
      gpu, cap,
    };
  },

  // ---------------- 1日進行 ----------------
  tick() {
    const s = this.state;
    if (s.gameOver) return;
    const r = this.computeReport();
    s.lastReport = r;
    s.day++;

    // 資金・利益
    s.cash += r.profit;
    s.totalProfit += r.profit;

    // ユーザー増減
    const net = r.organicIn + r.promoIn - r.churnOut - r.wrongBanOut;
    s.users = Math.max(1000, s.users + net);

    // BOT増減
    s.bots = Math.max(0, s.bots + r.botInflow - r.botBanAi - r.botBanReport);

    // 満足度・ストレージ
    s.satisfaction = Math.max(0, Math.min(100, s.satisfaction + r.satDelta));
    s.storageUsedTB += r.dau * CONFIG.STORAGE_MB_PER_DAU / 1e6;
    // ストレージ溢れ:古いデータ削除で信頼低下
    if (s.storageUsedTB > r.cap.storageTB) {
      s.storageUsedTB = r.cap.storageTB;
      s.trust = Math.max(0, s.trust - 0.5);
    }

    // 障害追跡
    if (r.outage) {
      s.outageDays++;
      const recover = Math.min(0.5, s.staff.engineer * 0.05);
      s.trust = Math.max(0, s.trust - (0.8 - recover));
      if (s.outageDays === 1) this.log('⚠️ サーバー過負荷で大規模障害が発生!エラー率' + Math.round(r.errorRate * 100) + '%', 'bad');
    } else {
      if (s.outageDays > 0) this.log('✅ 障害から復旧しました。', 'good');
      s.outageDays = 0;
      s.trust = Math.min(100, s.trust + 0.05);
    }

    // 納品処理
    s.pendingOrders = s.pendingOrders.filter(o => {
      o.daysLeft--;
      if (o.daysLeft <= 0) {
        s.servers[o.key] = (s.servers[o.key] || 0) + o.count;
        this.log(`📦 ${CONFIG.SERVERS[o.key].name} ×${o.count} が納品され稼働開始しました。`, 'good');
        return false;
      }
      return true;
    });

    // 炎上の進行
    this.tickIncidents(r);
    // 新規炎上判定
    this.rollIncidents(r);

    // マイルストーン
    for (const m of CONFIG.MILESTONES) {
      if (s.users >= m.users && !s.milestonesHit.includes(m.users)) {
        s.milestonesHit.push(m.users);
        s.cash += m.bonus;
        this.log(`🏆 ${m.title} ${m.msg}`, 'gold');
        if (m.users >= 10000000) { s.won = true; s.gameOver = true; this.pause(); }
      }
    }

    // 履歴
    const h = s.history;
    h.users.push(Math.round(s.users));
    h.cash.push(Math.round(s.cash));
    h.profit.push(Math.round(r.profit));
    h.satisfaction.push(Math.round(s.satisfaction * 10) / 10);
    h.load.push(Math.round(Math.min(r.worstUtil, 1.5) * 100));
    for (const k in h) if (h[k].length > CONFIG.HISTORY_MAX) h[k].shift();

    // 倒産判定
    if (s.cash < 0 && !s.graceUsed) {
      s.graceUsed = true;
      this.log('🚨 資金がマイナスに!銀行から緊急融資枠(-¥1,000万まで)が設定されました。早急に黒字化を!', 'bad');
    }
    if (s.cash < CONFIG.BANKRUPT_LINE) {
      s.gameOver = true; s.won = false; this.pause();
      this.log('💀 負債が限度額を超え、倒産しました…', 'bad');
    }

    if (typeof UI !== 'undefined') UI.render(true);
  },

  // ---------------- 炎上 ----------------
  tickIncidents(r) {
    const s = this.state;
    s.incidents = s.incidents.filter(inc => {
      inc.age++;
      // 放置すると加熱、時間経過で少し自然減衰
      inc.heat += inc.sev * 3.5 - inc.age * 1.6 - s.staff.pr * 0.8;
      inc.heat = Math.max(0, Math.min(150, inc.heat));
      if (inc.heat <= 0 || inc.age > 15) {
        this.log(`🕊️ 炎上「${inc.name}」は沈静化しました。`, 'good');
        s.trust = Math.max(0, s.trust - inc.sev * 0.5);
        return false;
      }
      return true;
    });
  },

  rollIncidents(r) {
    const s = this.state;
    if (s.incidents.length >= 3) return;
    // 原因別の発火確率
    const risks = {
      tox: Math.min(0.30, r.toxicExposure * 9),
      fban: Math.min(0.20, r.falseBans * 0.005),
      outage: r.outage ? 0.22 : 0,
      ad: s.adQuality === 0 ? 0.05 : s.adQuality === 1 ? 0.012 : 0.003,
      bot: Math.min(0.18, Math.max(0, r.botRatio - 0.05) * 1.6),
      random: 0.004,
    };
    for (const t of CONFIG.INCIDENT_TYPES) {
      const p = risks[t.cause] || 0;
      if (Math.random() < p * (1.15 - s.trust / 200)) {
        const sev = 1 + Math.floor(Math.random() * 3) + (s.users > 1000000 ? 1 : 0); // 1-4
        const inc = {
          uid: ++s.incidentSeq, id: t.id, name: t.name, desc: t.desc, icon: t.icon,
          sev, heat: 25 + sev * 15, age: 0,
        };
        s.incidents.push(inc);
        this.log(`🔥 炎上発生[重大度${sev}]: ${t.name}`, 'bad');
        if (this.speed > 0) this.pause();
        if (typeof UI !== 'undefined') UI.showIncidentAlert(inc);
        break; // 1日1件まで
      }
    }
  },

  respondIncident(uid, respId) {
    const s = this.state;
    const inc = s.incidents.find(i => i.uid === uid);
    if (!inc) return;
    const resp = CONFIG.RESPONSES.find(x => x.id === respId);
    let cost = resp.cost ?? (resp.costBase + resp.costPerSev * inc.sev);
    if (s.cash < cost) { this.log('❌ 資金不足で対応できません。', 'bad'); UI.render(); return; }
    s.cash -= cost;

    let prob = resp.base + s.staff.pr * 0.04 + (s.trust - 50) * 0.003;
    if (resp.id === 'silence' && inc.sev <= 1) prob += resp.smallBonus;
    prob = Math.max(0.05, Math.min(0.97, prob));
    const ok = Math.random() < prob;

    if (ok) {
      inc.heat -= resp.heatDown + s.staff.pr * 2;
      s.trust = Math.min(100, s.trust + resp.trustOk);
      this.log(`✅ 「${resp.name}」が奏功!「${inc.name}」の勢いが弱まりました(成功率${Math.round(prob * 100)}%)。`, 'good');
      if (inc.heat <= 0) {
        s.incidents = s.incidents.filter(i => i.uid !== uid);
        this.log(`🕊️ 炎上「${inc.name}」は完全に鎮火しました。`, 'good');
      }
    } else {
      inc.heat += resp.failHeat;
      s.trust = Math.max(0, s.trust + resp.trustNg);
      this.log(`❌ 「${resp.name}」は逆効果に…「${inc.name}」がさらに延焼(成功率${Math.round(prob * 100)}%)。`, 'bad');
    }
    if (typeof UI !== 'undefined') UI.render();
  },

  // ---------------- プレイヤー操作 ----------------
  buyServer(key, count = 1) {
    const s = this.state, sv = CONFIG.SERVERS[key];
    const cost = sv.price * count;
    if (s.cash < cost) { this.log('❌ 資金不足です。', 'bad'); UI.render(); return false; }
    s.cash -= cost;
    s.pendingOrders.push({ key, count, daysLeft: sv.delivery });
    this.log(`🛒 ${sv.name} ×${count} を発注(¥${cost.toLocaleString()}、納期${sv.delivery}日)`, 'info');
    UI.render(); return true;
  },

  sellServer(key, count = 1) {
    const s = this.state, sv = CONFIG.SERVERS[key];
    if ((s.servers[key] || 0) < count) return false;
    s.servers[key] -= count;
    const refund = Math.round(sv.price * 0.35 * count);
    s.cash += refund;
    this.log(`💸 ${sv.name} ×${count} を売却(+¥${refund.toLocaleString()}/中古価格35%)`, 'info');
    UI.render(); return true;
  },

  setCdn(units) {
    units = Math.max(0, Math.min(50, units));
    this.state.cdnUnits = units;
    UI.render();
  },

  hire(key, delta) {
    const s = this.state;
    const next = (s.staff[key] || 0) + delta;
    if (next < 0 || next > CONFIG.STAFF[key].max) return;
    s.staff[key] = next;
    UI.render();
  },

  setAiMod(tier) { this.state.aiModTier = tier; this.log(`🤖 AIモデレーション: ${CONFIG.AI_TIERS[tier].name} に変更`, 'info'); UI.render(); },
  setBotAi(tier) { this.state.botAiTier = tier; this.log(`🛡️ BOT検知AI: ${CONFIG.BOT_AI_TIERS[tier].name} に変更`, 'info'); UI.render(); },
  toggleCaptcha() { this.state.captcha = !this.state.captcha; UI.render(); },
  toggleSms() { this.state.smsVerify = !this.state.smsVerify; UI.render(); },
  toggleAutoScale() { this.state.autoScale = !this.state.autoScale; UI.render(); },
  setAdLoad(v) { this.state.adLoad = Math.max(0, Math.min(CONFIG.AD_LOAD_MAX, v)); UI.render(); },
  setAdQuality(q) { this.state.adQuality = q; UI.render(); },
  setPromo(v) { this.state.promoBudget = Math.max(0, v); UI.render(); },

  // ---------------- 時間制御 ----------------
  play(speed = 1) {
    this.speed = speed; this.paused = false;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), CONFIG.TICK_MS / speed);
    UI.renderTimeControls();
  },
  pause() {
    this.paused = true; clearInterval(this.timer); this.timer = null;
    if (typeof UI !== 'undefined') UI.renderTimeControls();
  },
};
